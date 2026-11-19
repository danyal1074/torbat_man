CREATE TYPE "public"."actor_kind" AS ENUM('citizen', 'staff', 'system');--> statement-breakpoint
CREATE TYPE "public"."announcement_importance" AS ENUM('normal', 'important');--> statement-breakpoint
CREATE TYPE "public"."comment_visibility" AS ENUM('public', 'internal');--> statement-breakpoint
CREATE TYPE "public"."feedback_kind" AS ENUM('bug', 'idea', 'question', 'other');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('request_submitted', 'status_changed', 'staff_reply', 'request_transferred', 'announcement');--> statement-breakpoint
CREATE TYPE "public"."org_role" AS ENUM('org_operator', 'org_dispatcher', 'org_manager');--> statement-breakpoint
CREATE TYPE "public"."platform_role" AS ENUM('platform_admin', 'content_editor', 'support_agent');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('submitted', 'triaged', 'assigned', 'in_progress', 'waiting_for_citizen', 'resolved', 'closed', 'rejected', 'reopened');--> statement-breakpoint
CREATE TYPE "public"."service_status" AS ENUM('active_demo', 'active_integrated', 'informational', 'coming_soon', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."session_kind" AS ENUM('citizen', 'staff');--> statement-breakpoint
CREATE TYPE "public"."workflow" AS ENUM('city_report', 'admin_request', 'emergency', 'info');--> statement-breakpoint
CREATE TABLE "ai_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid,
	"user_id" uuid,
	"provider" text NOT NULL,
	"model_version" text NOT NULL,
	"input_type" text DEFAULT 'text' NOT NULL,
	"prediction_json" jsonb NOT NULL,
	"confidence" real NOT NULL,
	"latency_ms" integer,
	"reviewed_by" uuid,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city_id" uuid NOT NULL,
	"organization_id" uuid,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"source_name" text NOT NULL,
	"source_url" text,
	"importance" "announcement_importance" DEFAULT 'normal' NOT NULL,
	"is_demo" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"published_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp (3) with time zone,
	"created_by" uuid,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"request_id" uuid,
	"kind" text DEFAULT 'citizen' NOT NULL,
	"object_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"checksum" text NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"scan_status" text DEFAULT 'not_scanned' NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attachments_objectKey_unique" UNIQUE("object_key")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"organization_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"province" text NOT NULL,
	"timezone" text DEFAULT 'Asia/Tehran' NOT NULL,
	"center_lat" double precision NOT NULL,
	"center_lng" double precision NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cities_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "duplicate_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"candidate_request_id" uuid NOT NULL,
	"score" real NOT NULL,
	"review_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city_id" uuid NOT NULL,
	"organization_id" uuid,
	"key" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"config_json" jsonb,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"kind" "feedback_kind" NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"key" text NOT NULL,
	"scope" text NOT NULL,
	"resource_id" uuid,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"entity_type" text,
	"entity_id" uuid,
	"read_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"unit_id" uuid,
	"role" "org_role" NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'active' NOT NULL,
	"is_demo" boolean DEFAULT true NOT NULL,
	"verified_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "otp_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mobile" text NOT NULL,
	"purpose" "session_kind" NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp (3) with time zone NOT NULL,
	"consumed_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"from_org_id" uuid,
	"to_org_id" uuid,
	"from_assignee_id" uuid,
	"to_assignee_id" uuid,
	"actor_id" uuid,
	"reason" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"author_id" uuid,
	"author_kind" "actor_kind" NOT NULL,
	"body" text NOT NULL,
	"visibility" "comment_visibility" NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"from_status" "request_status",
	"to_status" "request_status" NOT NULL,
	"actor_id" uuid,
	"actor_kind" "actor_kind" NOT NULL,
	"reason" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city_id" uuid NOT NULL,
	"citizen_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"organization_id" uuid,
	"unit_id" uuid,
	"assignee_id" uuid,
	"tracking_code" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"form_data" jsonb,
	"form_schema_version" integer,
	"status" "request_status" DEFAULT 'submitted' NOT NULL,
	"priority" "priority" DEFAULT 'normal' NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"address" text,
	"neighborhood" text,
	"address_text" text,
	"public_visibility" boolean DEFAULT false NOT NULL,
	"rating_score" smallint,
	"rating_comment" text,
	"submitted_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"first_response_at" timestamp (3) with time zone,
	"resolved_at" timestamp (3) with time zone,
	"closed_at" timestamp (3) with time zone,
	"due_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "requests_trackingCode_unique" UNIQUE("tracking_code")
);
--> statement-breakpoint
CREATE TABLE "service_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city_id" uuid NOT NULL,
	"parent_id" uuid,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"icon" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_form_schemas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"json_schema" jsonb NOT NULL,
	"ui_schema" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city_id" uuid NOT NULL,
	"organization_id" uuid,
	"category_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"short_title" text NOT NULL,
	"description" text NOT NULL,
	"icon" text NOT NULL,
	"status" "service_status" NOT NULL,
	"workflow" "workflow" NOT NULL,
	"requirements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"integration_note" text,
	"is_featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"sla_hours" integer,
	"form_schema_version" integer,
	"fees_verified" boolean DEFAULT false NOT NULL,
	"support_contact_verified" boolean DEFAULT false NOT NULL,
	"last_verified_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "session_kind" NOT NULL,
	"token_hash" text NOT NULL,
	"device_info" text,
	"expires_at" timestamp (3) with time zone NOT NULL,
	"revoked_at" timestamp (3) with time zone,
	"rotated_at" timestamp (3) with time zone,
	"last_used_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_sessions_tokenHash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mobile" text NOT NULL,
	"display_name" text,
	"status" text DEFAULT 'active' NOT NULL,
	"platform_role" "platform_role",
	"verified_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp (3) with time zone,
	CONSTRAINT "users_mobile_unique" UNIQUE("mobile")
);
--> statement-breakpoint
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duplicate_candidates" ADD CONSTRAINT "duplicate_candidates_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duplicate_candidates" ADD CONSTRAINT "duplicate_candidates_candidate_request_id_requests_id_fk" FOREIGN KEY ("candidate_request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_unit_id_organization_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."organization_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_units" ADD CONSTRAINT "organization_units_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_units" ADD CONSTRAINT "organization_units_parent_id_organization_units_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."organization_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_assignments" ADD CONSTRAINT "request_assignments_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_assignments" ADD CONSTRAINT "request_assignments_from_org_id_organizations_id_fk" FOREIGN KEY ("from_org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_assignments" ADD CONSTRAINT "request_assignments_to_org_id_organizations_id_fk" FOREIGN KEY ("to_org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_assignments" ADD CONSTRAINT "request_assignments_from_assignee_id_users_id_fk" FOREIGN KEY ("from_assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_assignments" ADD CONSTRAINT "request_assignments_to_assignee_id_users_id_fk" FOREIGN KEY ("to_assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_assignments" ADD CONSTRAINT "request_assignments_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_comments" ADD CONSTRAINT "request_comments_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_comments" ADD CONSTRAINT "request_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_status_history" ADD CONSTRAINT "request_status_history_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_status_history" ADD CONSTRAINT "request_status_history_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_citizen_id_users_id_fk" FOREIGN KEY ("citizen_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_unit_id_organization_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."organization_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_categories" ADD CONSTRAINT "service_categories_parent_id_service_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."service_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_form_schemas" ADD CONSTRAINT "service_form_schemas_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_category_id_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "announcements_city_id_status_published_at_index" ON "announcements" USING btree ("city_id","status","published_at");--> statement-breakpoint
CREATE INDEX "attachments_request_id_index" ON "attachments" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "attachments_owner_id_index" ON "attachments" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_index" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_type_entity_id_index" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "duplicate_candidates_request_id_index" ON "duplicate_candidates" USING btree ("request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "feature_flags_city_id_key_index" ON "feature_flags" USING btree ("city_id","key") WHERE "feature_flags"."organization_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_keys_user_id_scope_key_index" ON "idempotency_keys" USING btree ("user_id","scope","key");--> statement-breakpoint
CREATE INDEX "notifications_user_id_created_at_index" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_members_user_id_organization_id_index" ON "organization_members" USING btree ("user_id","organization_id");--> statement-breakpoint
CREATE INDEX "organization_members_organization_id_index" ON "organization_members" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "otp_challenges_mobile_created_at_index" ON "otp_challenges" USING btree ("mobile","created_at");--> statement-breakpoint
CREATE INDEX "request_assignments_request_id_created_at_index" ON "request_assignments" USING btree ("request_id","created_at");--> statement-breakpoint
CREATE INDEX "request_comments_request_id_created_at_index" ON "request_comments" USING btree ("request_id","created_at");--> statement-breakpoint
CREATE INDEX "request_status_history_request_id_created_at_index" ON "request_status_history" USING btree ("request_id","created_at");--> statement-breakpoint
CREATE INDEX "requests_organization_id_status_created_at_index" ON "requests" USING btree ("organization_id","status","created_at");--> statement-breakpoint
CREATE INDEX "requests_citizen_id_created_at_index" ON "requests" USING btree ("citizen_id","created_at");--> statement-breakpoint
CREATE INDEX "requests_service_id_created_at_index" ON "requests" USING btree ("service_id","created_at");--> statement-breakpoint
CREATE INDEX "requests_lat_lng_index" ON "requests" USING btree ("lat","lng");--> statement-breakpoint
CREATE UNIQUE INDEX "service_categories_city_id_slug_index" ON "service_categories" USING btree ("city_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "service_form_schemas_service_id_version_index" ON "service_form_schemas" USING btree ("service_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "services_city_id_slug_index" ON "services" USING btree ("city_id","slug");--> statement-breakpoint
CREATE INDEX "services_organization_id_index" ON "services" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "user_sessions_user_id_index" ON "user_sessions" USING btree ("user_id");