/**
 * Generate Clean Supabase Schema
 * 
 * This script generates a clean, production-ready SQL schema for Supabase
 * with proper sequence handling, data types, and constraints.
 */

import pool from '../src/lib/db';
import { writeFile } from 'fs/promises';

interface ColumnInfo {
  column_name: string;
  data_type: string;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  is_nullable: string;
  column_default: string | null;
  udt_name: string;
}

interface SequenceInfo {
  sequence_name: string;
  table_name: string;
  column_name: string;
}

async function generateSupabaseSchema() {
  console.log('🔧 Generating Clean Supabase Schema...\n');
  console.log('='.repeat(70));

  try {
    // Get all tables
    const [tables] = await pool.execute(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' 
         AND table_type = 'BASE TABLE'
       ORDER BY table_name`
    ) as any[];

    const sqlStatements: string[] = [];
    sqlStatements.push('-- ============================================');
    sqlStatements.push('-- Supabase Database Schema');
    sqlStatements.push('-- Generated from PostgreSQL database');
    sqlStatements.push('-- ============================================\n');

    // First, collect all sequences
    const sequences: SequenceInfo[] = [];
    for (const table of tables) {
      const [seqs] = await pool.execute(
        `SELECT 
          s.sequence_name,
          t.table_name,
          c.column_name
        FROM information_schema.sequences s
        JOIN information_schema.columns c 
          ON c.column_default LIKE '%' || s.sequence_name || '%'
        JOIN information_schema.tables t 
          ON t.table_name = c.table_name
        WHERE t.table_schema = 'public'
          AND c.table_schema = 'public'
          AND t.table_name = $1`,
        [table.table_name]
      ) as any[];

      if (Array.isArray(seqs)) {
        sequences.push(...seqs.map((s: any) => ({
          sequence_name: s.sequence_name,
          table_name: s.table_name,
          column_name: s.column_name,
        })));
      }
    }

    // Generate sequences first
    if (sequences.length > 0) {
      sqlStatements.push('-- Sequences');
      sqlStatements.push('-- ============================================\n');
      
      const uniqueSeqs = Array.from(new Set(sequences.map(s => s.sequence_name)));
      for (const seqName of uniqueSeqs) {
        // Just create sequences - Supabase will handle the details
        sqlStatements.push(`CREATE SEQUENCE IF NOT EXISTS ${seqName};`);
      }
      sqlStatements.push('');
    }

    // Generate CREATE TABLE statements
    sqlStatements.push('-- Tables');
    sqlStatements.push('-- ============================================\n');

    for (const table of tables) {
      const tableName = table.table_name;
      
      // Get columns
      const [columnsRaw] = await pool.execute(
        `SELECT 
          column_name,
          data_type,
          character_maximum_length,
          numeric_precision,
          numeric_scale,
          is_nullable,
          column_default,
          udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = $1
        ORDER BY ordinal_position`,
        [tableName]
      ) as any[];

      const columns = (Array.isArray(columnsRaw) ? columnsRaw : []) as ColumnInfo[];

      // Get primary key
      const [pkInfo] = await pool.execute(
        `SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = $1
          AND tc.constraint_type = 'PRIMARY KEY'
        ORDER BY kcu.ordinal_position`,
        [tableName]
      ) as any[];

      const pkColumns = Array.isArray(pkInfo) ? pkInfo.map((p: any) => p.column_name) : [];

      sqlStatements.push(`-- Table: ${tableName}`);
      sqlStatements.push(`CREATE TABLE IF NOT EXISTS ${tableName} (`);

      const columnDefs: string[] = [];
      for (const col of columns) {
        let colDef = `  ${col.column_name} `;
        
        // Map PostgreSQL types
        let sqlType = col.udt_name;
        if (col.udt_name === 'varchar') {
          sqlType = col.character_maximum_length 
            ? `varchar(${col.character_maximum_length})`
            : 'text';
        } else if (col.udt_name === 'bpchar') {
          sqlType = col.character_maximum_length 
            ? `char(${col.character_maximum_length})`
            : 'char(1)';
        } else if (col.udt_name === 'int4') {
          sqlType = 'integer';
        } else if (col.udt_name === 'int8') {
          sqlType = 'bigint';
        } else if (col.udt_name === 'int2') {
          sqlType = 'smallint';
        } else if (col.udt_name === 'bool') {
          sqlType = 'boolean';
        } else if (col.udt_name === 'timestamptz') {
          sqlType = 'timestamptz';
        } else if (col.udt_name === 'timestamp') {
          sqlType = 'timestamp';
        } else if (col.udt_name === 'date') {
          sqlType = 'date';
        } else if (col.udt_name === 'numeric') {
          if (col.numeric_precision && col.numeric_scale) {
            sqlType = `numeric(${col.numeric_precision},${col.numeric_scale})`;
          } else {
            sqlType = 'numeric';
          }
        } else if (col.udt_name === 'float8') {
          sqlType = 'double precision';
        } else if (col.udt_name === 'float4') {
          sqlType = 'real';
        }
        
        colDef += sqlType;
        
        if (col.is_nullable === 'NO') {
          colDef += ' NOT NULL';
        }
        
        // Handle default values
        if (col.column_default) {
          let defaultValue = col.column_default;
          
          // Handle sequence defaults
          if (defaultValue.includes('nextval')) {
            const seqMatch = defaultValue.match(/nextval\('([^']+)'/);
            if (seqMatch) {
              defaultValue = `nextval('${seqMatch[1]}'::regclass)`;
            }
          } else {
            // Remove type casts for simple defaults
            defaultValue = defaultValue.replace(/::\w+(\s+\w+)*/g, '');
            // Clean up string defaults - remove trailing "varying" or type casts
            defaultValue = defaultValue.replace(/\s+varying\s*$/i, '');
            defaultValue = defaultValue.replace(/\s*::\w+.*$/, '');
            // If it's an empty string default, make it explicit
            if (defaultValue === "''" || defaultValue === "''::character varying" || defaultValue === "''::bpchar") {
              defaultValue = "''";
            }
          }
          
          colDef += ` DEFAULT ${defaultValue}`;
        }
        
        columnDefs.push(colDef);
      }

      // Add primary key as the last "column" so it gets a comma automatically via join(',\n')
      if (pkColumns.length > 0) {
        columnDefs.push(`  PRIMARY KEY (${pkColumns.join(', ')})`);
      }
      
      sqlStatements.push(columnDefs.join(',\n'));
      sqlStatements.push(');\n');
    }

    // Generate indexes
    sqlStatements.push('-- Indexes');
    sqlStatements.push('-- ============================================\n');

    for (const table of tables) {
      const [indexes] = await pool.execute(
        `SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public' 
          AND tablename = $1
          AND indexname NOT LIKE '%_pkey'
          AND indexname NOT LIKE '%_pk'
        ORDER BY indexname`,
        [table.table_name]
      ) as any[];

      if (Array.isArray(indexes) && indexes.length > 0) {
        sqlStatements.push(`-- Indexes for ${table.table_name}`);
        for (const idx of indexes) {
          let indexSql = idx.indexdef;
          if (!indexSql.includes('IF NOT EXISTS')) {
            indexSql = indexSql.replace('CREATE INDEX', 'CREATE INDEX IF NOT EXISTS');
          }
          if (!indexSql.endsWith(';')) {
            indexSql += ';';
          }
          sqlStatements.push(indexSql);
        }
        sqlStatements.push('');
      }
    }

    // Generate foreign keys
    sqlStatements.push('-- Foreign Keys');
    sqlStatements.push('-- ============================================\n');

    for (const table of tables) {
      const [fks] = await pool.execute(
        `SELECT
          tc.constraint_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = $1
          AND tc.constraint_type = 'FOREIGN KEY'
        ORDER BY tc.constraint_name, kcu.ordinal_position`,
        [table.table_name]
      ) as any[];

      if (Array.isArray(fks) && fks.length > 0) {
        // Group by constraint name
        const fkGroups = new Map<string, { cols: string[], refCols: string[], refTable: string }>();
        
        for (const fk of fks) {
          if (!fkGroups.has(fk.constraint_name)) {
            fkGroups.set(fk.constraint_name, {
              cols: [],
              refCols: [],
              refTable: fk.foreign_table_name,
            });
          }
          const group = fkGroups.get(fk.constraint_name)!;
          group.cols.push(fk.column_name);
          group.refCols.push(fk.foreign_column_name);
        }

        sqlStatements.push(`-- Foreign keys for ${table.table_name}`);
        for (const [constraintName, group] of fkGroups) {
          sqlStatements.push(
            `ALTER TABLE ${table.table_name} ` +
            `ADD CONSTRAINT ${constraintName} ` +
            `FOREIGN KEY (${group.cols.join(', ')}) ` +
            `REFERENCES ${group.refTable}(${group.refCols.join(', ')}) ` +
            `ON DELETE CASCADE ON UPDATE CASCADE;`
          );
        }
        sqlStatements.push('');
      }
    }

    // Write to file
    const sqlContent = sqlStatements.join('\n');
    await writeFile('scripts/supabase-schema-clean.sql', sqlContent);
    console.log('✅ Clean schema saved to: scripts/supabase-schema-clean.sql');
    console.log(`\n📊 Generated schema for ${tables.length} tables\n`);

  } catch (error: any) {
    console.error('\n❌ Error generating schema:', error);
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

generateSupabaseSchema().catch(console.error);

