CREATE TABLE nob_businesses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES users(id),
 name text NOT NULL, status text NOT NULL DEFAULT 'pending', is_demo boolean NOT NULL DEFAULT false,
 config jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE nob_bookings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES nob_businesses(id),
 citizen_id uuid NOT NULL REFERENCES users(id), service_id text NOT NULL, employee_id text NOT NULL,
 resource text NOT NULL, start_at timestamptz NOT NULL, end_at timestamptz NOT NULL,
 buffer integer NOT NULL CHECK(buffer>=0), capacity integer NOT NULL CHECK(capacity>0),
 status text NOT NULL DEFAULT 'confirmed', code text NOT NULL UNIQUE, key text NOT NULL,
 snapshot jsonb NOT NULL, events jsonb NOT NULL DEFAULT '[]', paid integer NOT NULL DEFAULT 0 CHECK(paid>=0),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(citizen_id,key), CHECK(end_at>start_at)
);
--> statement-breakpoint
CREATE INDEX nob_bookings_business_time ON nob_bookings(business_id,start_at);
--> statement-breakpoint
CREATE INDEX nob_bookings_citizen ON nob_bookings(citizen_id);
--> statement-breakpoint
CREATE TABLE nob_tickets (
 call_key text,
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES nob_businesses(id),
 citizen_id uuid NOT NULL REFERENCES users(id), day text NOT NULL, number integer NOT NULL,
 status text NOT NULL DEFAULT 'waiting', created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(business_id,day,number)
);
--> statement-breakpoint
CREATE UNIQUE INDEX nob_ticket_call_key ON nob_tickets(business_id,call_key);
--> statement-breakpoint
CREATE INDEX nob_tickets_citizen ON nob_tickets(citizen_id);
--> statement-breakpoint
CREATE TABLE nob_members (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES nob_businesses(id),
 user_id uuid NOT NULL REFERENCES users(id), role text NOT NULL, employee_id text,
 UNIQUE(business_id,user_id)
);

--> statement-breakpoint
CREATE TABLE nob_waitlist (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES nob_businesses(id),
 citizen_id uuid NOT NULL REFERENCES users(id), service_id text NOT NULL, day text NOT NULL,
 status text NOT NULL DEFAULT 'waiting', slot jsonb, expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX nob_waitlist_business ON nob_waitlist(business_id,status);
--> statement-breakpoint
CREATE INDEX nob_waitlist_citizen ON nob_waitlist(citizen_id);

--> statement-breakpoint
CREATE TABLE nob_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL UNIQUE REFERENCES nob_bookings(id),
 business_id uuid NOT NULL REFERENCES nob_businesses(id), citizen_id uuid NOT NULL REFERENCES users(id),
 rating integer NOT NULL CHECK(rating BETWEEN 1 AND 5), body text NOT NULL,
 status text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now()
);
