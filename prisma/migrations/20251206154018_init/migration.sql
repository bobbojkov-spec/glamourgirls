-- CreateTable
CREATE TABLE "Girl" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "birthdate" TEXT,
    "birthplace" TEXT,
    "height" TEXT,
    "weight" TEXT,
    "biography" TEXT DEFAULT '',
    "alternativeNames" TEXT,
    "categories" TEXT,
    "socialLinks" TEXT,
    "seoTitle" TEXT,
    "metaDescription" TEXT,
    "metaKeywords" TEXT,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImage" TEXT,
    "canonicalUrl" TEXT,
    "slug" TEXT NOT NULL,
    "h1Title" TEXT,
    "h2Title" TEXT,
    "featuredImageId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Girl_featuredImageId_fkey" FOREIGN KEY ("featuredImageId") REFERENCES "GalleryImage" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GalleryImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "girlId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "thumbnailPath" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "altText" TEXT,
    "seoFilename" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GalleryImage_girlId_fkey" FOREIGN KEY ("girlId") REFERENCES "Girl" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GirlSEO" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "girlId" TEXT NOT NULL,
    "pageTitle" TEXT,
    "metaRobots" TEXT,
    "metaAuthor" TEXT,
    "metaCopyright" TEXT,
    "ogType" TEXT DEFAULT 'profile',
    "ogSiteName" TEXT,
    "ogUrl" TEXT,
    "twitterCard" TEXT,
    "twitterTitle" TEXT,
    "twitterDescription" TEXT,
    "twitterImage" TEXT,
    "structuredData" TEXT,
    "internalLinks" TEXT,
    "galleryTitle" TEXT,
    "galleryMetaDesc" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GirlSEO_girlId_fkey" FOREIGN KEY ("girlId") REFERENCES "Girl" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HomepageSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "introText" TEXT DEFAULT '',
    "mainTitle" TEXT,
    "h1Title" TEXT,
    "pageTitle" TEXT,
    "metaDescription" TEXT,
    "metaKeywords" TEXT,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImage" TEXT,
    "canonicalUrl" TEXT,
    "featuredGirlsIds" TEXT,
    "bannerImage" TEXT,
    "logoImage" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ImageView" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imageId" TEXT NOT NULL,
    "sessionId" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "referer" TEXT,
    "viewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImageView_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "GalleryImage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GirlView" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "girlId" TEXT NOT NULL,
    "sessionId" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "referer" TEXT,
    "viewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GirlView_girlId_fkey" FOREIGN KEY ("girlId") REFERENCES "Girl" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImagePurchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imageId" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "buyerId" TEXT,
    "purchaseDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" TEXT,
    "transactionId" TEXT,
    CONSTRAINT "ImagePurchase_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "GalleryImage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Girl_slug_key" ON "Girl"("slug");

-- CreateIndex
CREATE INDEX "Girl_slug_idx" ON "Girl"("slug");

-- CreateIndex
CREATE INDEX "Girl_name_idx" ON "Girl"("name");

-- CreateIndex
CREATE INDEX "GalleryImage_girlId_idx" ON "GalleryImage"("girlId");

-- CreateIndex
CREATE INDEX "GalleryImage_displayOrder_idx" ON "GalleryImage"("displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "GirlSEO_girlId_key" ON "GirlSEO"("girlId");

-- CreateIndex
CREATE UNIQUE INDEX "HomepageSettings_id_key" ON "HomepageSettings"("id");

-- CreateIndex
CREATE INDEX "ImageView_imageId_idx" ON "ImageView"("imageId");

-- CreateIndex
CREATE INDEX "ImageView_viewedAt_idx" ON "ImageView"("viewedAt");

-- CreateIndex
CREATE INDEX "GirlView_girlId_idx" ON "GirlView"("girlId");

-- CreateIndex
CREATE INDEX "GirlView_viewedAt_idx" ON "GirlView"("viewedAt");

-- CreateIndex
CREATE INDEX "ImagePurchase_imageId_idx" ON "ImagePurchase"("imageId");

-- CreateIndex
CREATE INDEX "ImagePurchase_purchaseDate_idx" ON "ImagePurchase"("purchaseDate");
