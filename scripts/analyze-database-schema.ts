/**
 * Analyze Current PostgreSQL Database Schema
 * 
 * This script examines all tables, columns, indexes, constraints, and foreign keys
 * to generate a complete schema definition for Supabase migration.
 */

import pool from '../src/lib/db';

interface ColumnInfo {
  column_name: string;
  data_type: string;
  character_maximum_length: number | null;
  is_nullable: string;
  column_default: string | null;
  udt_name: string;
}

interface IndexInfo {
  indexname: string;
  indexdef: string;
}

interface ConstraintInfo {
  constraint_name: string;
  constraint_type: string;
  table_name: string;
  column_name: string | null;
  foreign_table_name: string | null;
  foreign_column_name: string | null;
}

async function analyzeSchema() {
  console.log('🔍 Analyzing PostgreSQL Database Schema...\n');
  console.log('='.repeat(70));

  try {
    // Get all tables
    const [tables] = (await pool.execute(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' 
         AND table_type = 'BASE TABLE'
       ORDER BY table_name`
    )) as [any[], any];

    const schema: Record<string, {
      columns: ColumnInfo[];
      indexes: IndexInfo[];
      constraints: ConstraintInfo[];
      rowCount: number;
    }> = {};

    console.log(`\n📊 Found ${tables.length} tables:\n`);
    tables.forEach((t: any) => console.log(`   - ${t.table_name}`));

    // Analyze each table
    for (const table of tables) {
      const tableName = table.table_name;
      console.log(`\n${'='.repeat(70)}`);
      console.log(`📋 Analyzing table: ${tableName}`);
      console.log('-'.repeat(70));

      // Get columns
      const [columns] = (await pool.execute(
        `SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default,
          udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = $1
        ORDER BY ordinal_position`,
        [tableName]
      )) as [ColumnInfo[], any];

      console.log(`\n   Columns (${columns.length}):`);
      columns.forEach((col: ColumnInfo) => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
        console.log(`      - ${col.column_name}: ${col.udt_name}${length} ${nullable}${defaultVal}`);
      });

      // Get indexes
      const [indexes] = (await pool.execute(
        `SELECT 
          indexname,
          indexdef
        FROM pg_indexes
        WHERE schemaname = 'public' 
          AND tablename = $1
        ORDER BY indexname`,
        [tableName]
      )) as [IndexInfo[], any];

      // Filter out primary key indexes (they're handled by constraints)
      const nonPkIndexes = indexes.filter(idx => 
        !idx.indexname.includes('_pkey') && 
        !idx.indexname.includes('_pk')
      );

      if (nonPkIndexes.length > 0) {
        console.log(`\n   Indexes (${nonPkIndexes.length}):`);
        nonPkIndexes.forEach((idx: IndexInfo) => {
          console.log(`      - ${idx.indexname}: ${idx.indexdef}`);
        });
      }

      // Get constraints (primary keys, foreign keys, unique constraints)
      const [constraints] = (await pool.execute(
        `SELECT
          tc.constraint_name,
          tc.constraint_type,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = $1
        ORDER BY tc.constraint_type, tc.constraint_name`,
        [tableName]
      )) as [ConstraintInfo[], any];

      if (constraints.length > 0) {
        console.log(`\n   Constraints (${constraints.length}):`);
        constraints.forEach((con: ConstraintInfo) => {
          if (con.constraint_type === 'FOREIGN KEY') {
            console.log(`      - ${con.constraint_name}: ${con.constraint_type} (${con.column_name} -> ${con.foreign_table_name}.${con.foreign_column_name})`);
          } else {
            console.log(`      - ${con.constraint_name}: ${con.constraint_type} (${con.column_name || 'N/A'})`);
          }
        });
      }

      // Get row count
      const [countResult] = await pool.execute(
        `SELECT COUNT(*)::int as count FROM ${tableName}`
      ) as any[];
      const rowCount = countResult?.[0]?.count || 0;
      console.log(`\n   Row Count: ${rowCount.toLocaleString()}`);

      schema[tableName] = {
        columns,
        indexes: nonPkIndexes,
        constraints,
        rowCount,
      };
    }

    // Generate SQL schema
    console.log(`\n${'='.repeat(70)}`);
    console.log('📝 Generating SQL Schema for Supabase...');
    console.log('='.repeat(70));

    const sqlStatements: string[] = [];
    
    // Generate CREATE TABLE statements
    for (const [tableName, tableInfo] of Object.entries(schema)) {
      const columns = tableInfo.columns;
      const constraints = tableInfo.constraints;
      
      // Find primary key
      const pkConstraint = constraints.find(c => c.constraint_type === 'PRIMARY KEY');
      const pkColumns = pkConstraint 
        ? constraints.filter(c => c.constraint_name === pkConstraint.constraint_name).map(c => c.column_name).filter(Boolean)
        : [];

      let createTable = `CREATE TABLE IF NOT EXISTS ${tableName} (\n`;
      
      const columnDefs: string[] = [];
      for (const col of columns) {
        let colDef = `  ${col.column_name} `;
        
        // Map PostgreSQL types to standard SQL
        let sqlType = col.udt_name;
        if (col.udt_name === 'varchar' || col.udt_name === 'char') {
          sqlType = col.character_maximum_length 
            ? `${col.udt_name}(${col.character_maximum_length})`
            : 'text';
        } else if (col.udt_name === 'int4') {
          sqlType = 'integer';
        } else if (col.udt_name === 'int8') {
          sqlType = 'bigint';
        } else if (col.udt_name === 'bool') {
          sqlType = 'boolean';
        } else if (col.udt_name === 'timestamp') {
          sqlType = 'timestamp';
        } else if (col.udt_name === 'float8') {
          sqlType = 'double precision';
        } else if (col.udt_name === 'float4') {
          sqlType = 'real';
        }
        
        colDef += sqlType;
        
        if (col.is_nullable === 'NO') {
          colDef += ' NOT NULL';
        }
        
        if (col.column_default) {
          // Clean up default values
          let defaultValue = col.column_default;
          // Remove ::type casts from defaults
          defaultValue = defaultValue.replace(/::\w+/g, '');
          colDef += ` DEFAULT ${defaultValue}`;
        }
        
        columnDefs.push(colDef);
      }
      
      createTable += columnDefs.join(',\n');
      
      // Add primary key if exists
      if (pkColumns.length > 0) {
        createTable += `,\n  PRIMARY KEY (${pkColumns.join(', ')})`;
      }
      
      createTable += '\n);';
      sqlStatements.push(createTable);
      sqlStatements.push(''); // Empty line
    }

    // Generate indexes
    for (const [tableName, tableInfo] of Object.entries(schema)) {
      if (tableInfo.indexes.length > 0) {
        sqlStatements.push(`-- Indexes for ${tableName}`);
        for (const idx of tableInfo.indexes) {
          // Convert CREATE INDEX to CREATE INDEX IF NOT EXISTS
          let indexSql = idx.indexdef;
          if (!indexSql.includes('IF NOT EXISTS')) {
            indexSql = indexSql.replace('CREATE INDEX', 'CREATE INDEX IF NOT EXISTS');
          }
          sqlStatements.push(indexSql + ';');
        }
        sqlStatements.push('');
      }
    }

    // Generate foreign keys
    for (const [tableName, tableInfo] of Object.entries(schema)) {
      const fkConstraints = tableInfo.constraints.filter(c => c.constraint_type === 'FOREIGN KEY');
      if (fkConstraints.length > 0) {
        sqlStatements.push(`-- Foreign keys for ${tableName}`);
        for (const fk of fkConstraints) {
          const fkCols = tableInfo.constraints
            .filter(c => c.constraint_name === fk.constraint_name)
            .map(c => c.column_name)
            .filter(Boolean);
          const refCols = tableInfo.constraints
            .filter(c => c.constraint_name === fk.constraint_name)
            .map(c => c.foreign_column_name)
            .filter(Boolean);
          
          sqlStatements.push(
            `ALTER TABLE ${tableName} ADD CONSTRAINT ${fk.constraint_name} ` +
            `FOREIGN KEY (${fkCols.join(', ')}) ` +
            `REFERENCES ${fk.foreign_table_name}(${refCols.join(', ')}) ` +
            `ON DELETE CASCADE ON UPDATE CASCADE;`
          );
        }
        sqlStatements.push('');
      }
    }

    // Write to file
    const fs = await import('fs/promises');
    const sqlContent = sqlStatements.join('\n');
    await fs.writeFile('scripts/supabase-schema.sql', sqlContent);
    console.log('\n✅ Schema saved to: scripts/supabase-schema.sql');

    // Also save detailed JSON for reference
    await fs.writeFile(
      'scripts/database-schema-analysis.json',
      JSON.stringify(schema, null, 2)
    );
    console.log('✅ Detailed analysis saved to: scripts/database-schema-analysis.json');

    console.log(`\n📊 Summary:`);
    console.log(`   - Tables: ${Object.keys(schema).length}`);
    console.log(`   - Total columns: ${Object.values(schema).reduce((sum, t) => sum + t.columns.length, 0)}`);
    console.log(`   - Total indexes: ${Object.values(schema).reduce((sum, t) => sum + t.indexes.length, 0)}`);
    console.log(`   - Total constraints: ${Object.values(schema).reduce((sum, t) => sum + t.constraints.length, 0)}`);
    console.log(`   - Total rows: ${Object.values(schema).reduce((sum, t) => sum + t.rowCount, 0).toLocaleString()}`);

  } catch (error: any) {
    console.error('\n❌ Error analyzing schema:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    try {
      await pool.end();
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

analyzeSchema().catch(console.error);

