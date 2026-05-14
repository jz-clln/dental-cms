-- clinics table additions
verification_status  TEXT DEFAULT 'unverified'
dti_sec_number       TEXT
owner_name           TEXT
business_address     TEXT
dpa_signed_at        TIMESTAMPTZ
dpa_signed_by        TEXT
verified_at          TIMESTAMPTZ

-- patients table addition
consent_given        BOOLEAN DEFAULT FALSE
consent_given_at     TIMESTAMPTZ