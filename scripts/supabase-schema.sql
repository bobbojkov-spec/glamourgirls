CREATE TABLE IF NOT EXISTS anon_stats (
  id bigint NOT NULL DEFAULT nextval('anon_stats_id_seq'),
  imgid bigint NOT NULL DEFAULT '0',
  dt timestamptz,
  ip varchar(32) NOT NULL DEFAULT '' varying,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS country (
  iso bpchar NOT NULL,
  name varchar(80) NOT NULL,
  printable_name varchar(80) NOT NULL,
  numcode int2,
  order_desc integer,
  PRIMARY KEY (iso)
);

CREATE TABLE IF NOT EXISTS credits (
  id integer NOT NULL DEFAULT nextval('credits_id_seq'),
  user_id integer NOT NULL,
  credits integer NOT NULL,
  data_buying integer NOT NULL,
  country varchar(64) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS credits_buying (
  id integer NOT NULL DEFAULT nextval('credits_buying_id_seq'),
  user_id integer NOT NULL,
  credits integer NOT NULL,
  total_price numeric NOT NULL,
  data_buying integer NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS favorites (
  member_id integer NOT NULL,
  img_id integer NOT NULL
);

CREATE TABLE IF NOT EXISTS girl_favorites (
  member_id integer NOT NULL,
  girl_id integer NOT NULL
);

CREATE TABLE IF NOT EXISTS girlinfos (
  id bigint NOT NULL DEFAULT nextval('girlinfos_id_seq'),
  girlid bigint NOT NULL DEFAULT '0',
  shrttext varchar(255) NOT NULL DEFAULT '' varying,
  lngtext text NOT NULL,
  ord bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS girlinfos2 (
  id bigint NOT NULL DEFAULT nextval('girlinfos2_id_seq'),
  girlid bigint NOT NULL DEFAULT '0',
  shrttext varchar(255) NOT NULL DEFAULT '' varying,
  lngtext text NOT NULL,
  ord bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS girllinks (
  id bigint NOT NULL DEFAULT nextval('girllinks_id_seq'),
  girlid bigint NOT NULL DEFAULT '0',
  ord bigint NOT NULL DEFAULT '0',
  caption varchar(255) NOT NULL DEFAULT '' varying,
  lnk varchar(255) NOT NULL DEFAULT '' varying,
  tp int2 NOT NULL DEFAULT '0',
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS girls (
  id bigint NOT NULL DEFAULT nextval('girls_id_seq'),
  nm varchar(255) NOT NULL DEFAULT '' varying,
  fnu bpchar NOT NULL DEFAULT '',
  fmu bpchar NOT NULL DEFAULT '',
  firstname varchar(255) NOT NULL DEFAULT '' varying,
  middlenames varchar(255) NOT NULL DEFAULT '' varying,
  familiq varchar(255) NOT NULL DEFAULT '' varying,
  godini int2 NOT NULL DEFAULT '1',
  membersonly int2 NOT NULL DEFAULT '1',
  sources text NOT NULL,
  isnew int2 NOT NULL DEFAULT '1',
  published int2 NOT NULL DEFAULT '1',
  isnewpix int2 NOT NULL DEFAULT '1',
  theirman boolean,
  seotitle varchar(255),
  metadescription text,
  metakeywords text,
  ogtitle varchar(255),
  ogdescription text,
  ogimage varchar(500),
  canonicalurl varchar(500),
  h1title varchar(255),
  h2title varchar(255),
  slug varchar(255),
  introtext text,
  views integer DEFAULT 0,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS images (
  id integer NOT NULL DEFAULT nextval('images_id_seq'),
  path varchar(255),
  imgtype int2 NOT NULL DEFAULT '0',
  mytp int2 NOT NULL DEFAULT '0',
  width integer NOT NULL DEFAULT 0,
  height integer NOT NULL DEFAULT 0,
  mimetype varchar(255) NOT NULL DEFAULT '' varying,
  girlid bigint NOT NULL DEFAULT '0',
  thumbid bigint NOT NULL DEFAULT '0',
  sz varchar(255) NOT NULL DEFAULT '' varying,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS images2 (
  id bigint NOT NULL DEFAULT nextval('images2_id_seq'),
  nm varchar(255),
  createdate timestamptz,
  modifydate timestamptz,
  createdby bigint NOT NULL DEFAULT '0',
  lastmodifiedby bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS img_downloads (
  id integer NOT NULL DEFAULT nextval('img_downloads_id_seq'),
  email varchar(64) NOT NULL,
  img_id integer NOT NULL,
  rand_string varchar(32),
  validity_link integer,
  ip_download varchar(20) NOT NULL,
  num_download integer NOT NULL DEFAULT 0,
  transaction_id integer NOT NULL,
  time_download integer NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS info_transaction (
  transaction_id integer NOT NULL DEFAULT nextval('info_transaction_transaction_id_seq'),
  member_id integer NOT NULL,
  count_pictures integer NOT NULL,
  total_price numeric NOT NULL,
  data_transaction integer NOT NULL,
  PRIMARY KEY (transaction_id)
);

CREATE TABLE IF NOT EXISTS members (
  id bigint NOT NULL DEFAULT nextval('members_id_seq'),
  uname varchar(255) NOT NULL DEFAULT '' varying,
  email varchar(255) NOT NULL DEFAULT '' varying,
  pass varchar(255) NOT NULL DEFAULT '' varying,
  fname varchar(255) NOT NULL DEFAULT '' varying,
  lname varchar(255) NOT NULL DEFAULT '' varying,
  active bigint NOT NULL DEFAULT '2',
  activation_key varchar(32) NOT NULL,
  ticket varchar(255) NOT NULL,
  is_old_user integer NOT NULL DEFAULT 0,
  membership_status integer,
  picture_credits integer,
  country varchar(65),
  old_uname varchar(255) NOT NULL,
  date_registered integer NOT NULL DEFAULT 1301608800,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS members_2009 (
  id bigint NOT NULL DEFAULT nextval('members_2009_id_seq'),
  uname varchar(255) NOT NULL DEFAULT '' varying,
  email varchar(255) NOT NULL DEFAULT '' varying,
  pass varchar(255) NOT NULL DEFAULT '' varying,
  fname varchar(255) NOT NULL DEFAULT '' varying,
  lname varchar(255) NOT NULL DEFAULT '' varying,
  active bigint NOT NULL DEFAULT '2',
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS members_2011 (
  id bigint NOT NULL DEFAULT nextval('members_2011_id_seq'),
  uname varchar(255) NOT NULL DEFAULT '' varying,
  email varchar(255) NOT NULL DEFAULT '' varying,
  pass varchar(255) NOT NULL DEFAULT '' varying,
  fname varchar(255) NOT NULL DEFAULT '' varying,
  lname varchar(255) NOT NULL DEFAULT '' varying,
  active bigint NOT NULL DEFAULT '2',
  activation_key varchar(32) NOT NULL,
  ticket varchar(255) NOT NULL,
  is_old_user integer NOT NULL DEFAULT 0,
  membership_status integer,
  picture_credits integer,
  country varchar(65),
  old_uname varchar(255) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS newsletter (
  id bigint NOT NULL DEFAULT nextval('newsletter_id_seq'),
  subject varchar(255) NOT NULL DEFAULT '' varying,
  txt text NOT NULL,
  tstamp timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  pic varchar(255),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS newsletter2 (
  id bigint NOT NULL DEFAULT nextval('newsletter2_id_seq'),
  fromemail varchar(255) NOT NULL DEFAULT '' varying,
  fromname varchar(255) NOT NULL DEFAULT '' varying,
  subject varchar(255) NOT NULL DEFAULT '' varying,
  body text,
  altbody text,
  st int2 NOT NULL DEFAULT '0',
  dtsended timestamptz,
  createdate timestamptz,
  modifydate timestamptz,
  createdby bigint NOT NULL DEFAULT '0',
  lastmodifiedby bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS newsletter2_filter (
  nid integer NOT NULL,
  chk text NOT NULL,
  PRIMARY KEY (nid)
);

CREATE TABLE IF NOT EXISTS newsletter2_images (
  nid integer NOT NULL,
  image_id integer NOT NULL,
  PRIMARY KEY (nid, nid, image_id, image_id)
);

CREATE TABLE IF NOT EXISTS newsletter2_running (
  st integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS newsletter2_states (
  id integer NOT NULL DEFAULT nextval('newsletter2_states_id_seq'),
  nm varchar(255) NOT NULL,
  ord integer,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS newslettermembers (
  id bigint NOT NULL DEFAULT nextval('newslettermembers_id_seq'),
  nid bigint NOT NULL DEFAULT '0',
  uid bigint NOT NULL DEFAULT '0',
  email varchar(255) NOT NULL DEFAULT '' varying,
  nm varchar(255) NOT NULL DEFAULT '' varying,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS newsletters2_sended (
  nid integer NOT NULL,
  memberid bigint NOT NULL DEFAULT '0',
  tp integer NOT NULL,
  st integer NOT NULL DEFAULT 0,
  PRIMARY KEY (nid, nid, memberid, memberid)
);

CREATE TABLE IF NOT EXISTS prava (
  id bigint NOT NULL DEFAULT nextval('prava_id_seq'),
  crdate timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  otdate date,
  dodate date,
  typ int2 NOT NULL DEFAULT '0',
  girlid bigint NOT NULL DEFAULT '0',
  mid bigint NOT NULL DEFAULT '0',
  zid bigint NOT NULL DEFAULT '0',
  mn numeric NOT NULL DEFAULT 0.00,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS related_actresses (
  id integer NOT NULL DEFAULT nextval('related_actresses_id_seq'),
  actress_id integer NOT NULL,
  related_id integer NOT NULL,
  reason text,
  score integer DEFAULT 1,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS stats (
  id bigint NOT NULL DEFAULT nextval('stats_id_seq'),
  mid bigint NOT NULL DEFAULT '0',
  imgid bigint NOT NULL DEFAULT '0',
  dt timestamptz,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS subimages2 (
  image_format varchar(32) NOT NULL,
  image_id bigint NOT NULL,
  uripath varchar(255) NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  tp int2 NOT NULL,
  sz varchar(32),
  tsmp timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (image_id, image_id, tp, tp)
);

CREATE TABLE IF NOT EXISTS subs (
  id bigint NOT NULL DEFAULT nextval('subs_id_seq'),
  typ int2 NOT NULL DEFAULT '1',
  custom bigint NOT NULL DEFAULT '0',
  dni int2 NOT NULL DEFAULT '0',
  mm int2 NOT NULL DEFAULT '0',
  pr numeric NOT NULL DEFAULT 0.00,
  shdesc varchar(255) NOT NULL DEFAULT '' varying,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS test (
  post_method text NOT NULL
);

CREATE TABLE IF NOT EXISTS types (
  id bigint NOT NULL DEFAULT nextval('types_id_seq'),
  nm varchar(255) NOT NULL DEFAULT '' varying,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS views_log (
  id integer NOT NULL DEFAULT nextval('views_log_id_seq'),
  girlid integer NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS zaiavki (
  id bigint NOT NULL DEFAULT nextval('zaiavki_id_seq'),
  tst timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  mn numeric NOT NULL DEFAULT 0.00,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS zaiavki_copy (
  id bigint NOT NULL DEFAULT nextval('zaiavki_copy_id_seq'),
  tst timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  mn numeric NOT NULL DEFAULT 0.00,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS zaiavkidet (
  id bigint NOT NULL DEFAULT nextval('zaiavkidet_id_seq'),
  zid bigint NOT NULL DEFAULT '0',
  key varchar(255) NOT NULL DEFAULT '' varying,
  val varchar(255) NOT NULL DEFAULT '' varying,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS zaiavkidet_copy (
  id bigint NOT NULL DEFAULT nextval('zaiavkidet_copy_id_seq'),
  zid bigint NOT NULL DEFAULT '0',
  key varchar(255) NOT NULL DEFAULT '' varying,
  val varchar(255) NOT NULL DEFAULT '' varying,
  PRIMARY KEY (id)
);

-- Indexes for anon_stats
CREATE INDEX IF NOT EXISTS idx_16655_imgid ON public.anon_stats USING btree (imgid);
CREATE UNIQUE INDEX idx_16655_primary ON public.anon_stats USING btree (id);

-- Indexes for country
CREATE UNIQUE INDEX idx_16661_primary ON public.country USING btree (iso);

-- Indexes for credits
CREATE UNIQUE INDEX idx_16665_primary ON public.credits USING btree (id);

-- Indexes for credits_buying
CREATE UNIQUE INDEX idx_16670_primary ON public.credits_buying USING btree (id);

-- Indexes for girl_favorites
CREATE UNIQUE INDEX idx_16677_girl_id ON public.girl_favorites USING btree (girl_id, member_id);

-- Indexes for girlinfos
CREATE INDEX IF NOT EXISTS idx_16681_girlid ON public.girlinfos USING btree (girlid);
CREATE INDEX IF NOT EXISTS idx_16681_ord ON public.girlinfos USING btree (ord);
CREATE UNIQUE INDEX idx_16681_primary ON public.girlinfos USING btree (id);

-- Indexes for girlinfos2
CREATE INDEX IF NOT EXISTS idx_16691_girlid ON public.girlinfos2 USING btree (girlid);
CREATE INDEX IF NOT EXISTS idx_16691_ord ON public.girlinfos2 USING btree (ord);
CREATE UNIQUE INDEX idx_16691_primary ON public.girlinfos2 USING btree (id);

-- Indexes for girllinks
CREATE INDEX IF NOT EXISTS idx_16701_girlid ON public.girllinks USING btree (girlid);
CREATE INDEX IF NOT EXISTS idx_16701_ord ON public.girllinks USING btree (ord);
CREATE UNIQUE INDEX idx_16701_primary ON public.girllinks USING btree (id);

-- Indexes for girls
CREATE INDEX IF NOT EXISTS idx_16713_fmu ON public.girls USING btree (fmu);
CREATE INDEX IF NOT EXISTS idx_16713_fnu ON public.girls USING btree (fnu);
CREATE INDEX IF NOT EXISTS idx_16713_godini ON public.girls USING btree (godini);
CREATE UNIQUE INDEX idx_16713_primary ON public.girls USING btree (id);

-- Indexes for images
CREATE INDEX IF NOT EXISTS idx_16732_girlid ON public.images USING btree (girlid);
CREATE UNIQUE INDEX idx_16732_primary ON public.images USING btree (id);
CREATE INDEX IF NOT EXISTS idx_16732_thumbid ON public.images USING btree (thumbid);

-- Indexes for images2
CREATE UNIQUE INDEX idx_16747_primary ON public.images2 USING btree (id);

-- Indexes for img_downloads
CREATE UNIQUE INDEX idx_16754_primary ON public.img_downloads USING btree (id);

-- Indexes for info_transaction
CREATE UNIQUE INDEX idx_16760_primary ON public.info_transaction USING btree (transaction_id);
CREATE INDEX IF NOT EXISTS idx_16760_transaction_id ON public.info_transaction USING btree (transaction_id);

-- Indexes for members
CREATE UNIQUE INDEX idx_16765_primary ON public.members USING btree (id);

-- Indexes for members_2009
CREATE UNIQUE INDEX idx_16780_primary ON public.members_2009 USING btree (id);
CREATE UNIQUE INDEX idx_16780_uname ON public.members_2009 USING btree (uname);

-- Indexes for members_2011
CREATE UNIQUE INDEX idx_16793_primary ON public.members_2011 USING btree (id);
CREATE UNIQUE INDEX idx_16793_uname ON public.members_2011 USING btree (uname);

-- Indexes for newsletter
CREATE UNIQUE INDEX idx_16807_primary ON public.newsletter USING btree (id);

-- Indexes for newsletter2
CREATE UNIQUE INDEX idx_16816_primary ON public.newsletter2 USING btree (id);

-- Indexes for newsletter2_filter
CREATE UNIQUE INDEX idx_16828_primary ON public.newsletter2_filter USING btree (nid);

-- Indexes for newsletter2_images
CREATE UNIQUE INDEX idx_16833_primary ON public.newsletter2_images USING btree (nid, image_id);

-- Indexes for newsletter2_states
CREATE UNIQUE INDEX idx_16841_primary ON public.newsletter2_states USING btree (id);

-- Indexes for newslettermembers
CREATE UNIQUE INDEX idx_16846_primary ON public.newslettermembers USING btree (id);

-- Indexes for newsletters2_sended
CREATE UNIQUE INDEX idx_16856_primary ON public.newsletters2_sended USING btree (nid, memberid);

-- Indexes for prava
CREATE UNIQUE INDEX idx_16862_primary ON public.prava USING btree (id);

-- Indexes for related_actresses
CREATE INDEX IF NOT EXISTS idx_16873_idx_actress_id ON public.related_actresses USING btree (actress_id);
CREATE INDEX IF NOT EXISTS idx_16873_idx_related_id ON public.related_actresses USING btree (related_id);
CREATE INDEX IF NOT EXISTS idx_16873_idx_score ON public.related_actresses USING btree (score);
CREATE UNIQUE INDEX idx_16873_primary ON public.related_actresses USING btree (id);
CREATE UNIQUE INDEX idx_16873_unique_relation ON public.related_actresses USING btree (actress_id, related_id);

-- Indexes for stats
CREATE UNIQUE INDEX idx_16883_primary ON public.stats USING btree (id);

-- Indexes for subimages2
CREATE UNIQUE INDEX idx_16889_primary ON public.subimages2 USING btree (image_id, tp);

-- Indexes for subs
CREATE UNIQUE INDEX idx_16894_primary ON public.subs USING btree (id);

-- Indexes for types
CREATE UNIQUE INDEX idx_16910_primary ON public.types USING btree (id);

-- Indexes for views_log
CREATE INDEX IF NOT EXISTS idx_16916_idx_girlid ON public.views_log USING btree (girlid);
CREATE INDEX IF NOT EXISTS idx_16916_idx_viewed_at ON public.views_log USING btree (viewed_at);
CREATE UNIQUE INDEX idx_16916_primary ON public.views_log USING btree (id);

-- Indexes for zaiavki
CREATE UNIQUE INDEX idx_16922_primary ON public.zaiavki USING btree (id);

-- Indexes for zaiavki_copy
CREATE UNIQUE INDEX idx_16929_primary ON public.zaiavki_copy USING btree (id);

-- Indexes for zaiavkidet
CREATE UNIQUE INDEX idx_16936_primary ON public.zaiavkidet USING btree (id);

-- Indexes for zaiavkidet_copy
CREATE UNIQUE INDEX idx_16946_primary ON public.zaiavkidet_copy USING btree (id);

-- Foreign keys for images
ALTER TABLE images ADD CONSTRAINT fk_images_girlid FOREIGN KEY (girlid) REFERENCES girls(id) ON DELETE CASCADE ON UPDATE CASCADE;
