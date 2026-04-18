-- ============================================================
-- DENTAL CMS - SEED DATA
-- "Bright Smile Dental Clinic" demo data
--
-- IMPORTANT: Run schema.sql FIRST before this file.
-- Also: Create the admin user in Supabase Auth first,
-- then replace 'YOUR_AUTH_USER_ID' with the actual UUID.
-- ============================================================

-- 1. CLINIC
INSERT INTO clinics (id, name, address, contact_number, email)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Bright Smile Dental Clinic',
  '2F Sunshine Building, JP Rizal Avenue, Calamba City, Laguna',
  '+63 49 555 0123',
  'hello@brightsmile.ph'
);

-- 2. STAFF (admin account — replace auth_user_id after creating the user in Auth)
-- Go to Supabase > Authentication > Users > Create User
-- Email: admin@brightsmile.ph | Password: BrightSmile2024!
-- Copy the UUID and paste below
INSERT INTO staff (id, clinic_id, auth_user_id, email, full_name, role)
VALUES (
  'b1b2c3d4-0000-0000-0000-000000000001',
  'a1b2c3d4-0000-0000-0000-000000000001',
  NULL, -- REPLACE WITH: 'paste-your-auth-user-uuid-here'
  'admin@brightsmile.ph',
  'Maria Santos',
  'admin'
);

-- 3. DENTISTS
INSERT INTO dentists (id, clinic_id, name, specialty, schedule_days)
VALUES
  (
    'c1000000-0000-0000-0000-000000000001',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Dr. Jose Reyes',
    'General Dentistry',
    ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday']
  ),
  (
    'c1000000-0000-0000-0000-000000000002',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Dr. Ana Villanueva',
    'Orthodontics',
    ARRAY['Monday','Wednesday','Friday']
  ),
  (
    'c1000000-0000-0000-0000-000000000003',
    'a1b2c3d4-0000-0000-0000-000000000001',
    'Dr. Ramon Cruz',
    'Oral Surgery',
    ARRAY['Tuesday','Thursday','Saturday']
  );

-- 4. PATIENTS (15 patients with realistic Filipino names)
INSERT INTO patients (id, clinic_id, first_name, last_name, birthday, address, contact_number, email)
VALUES
  ('d0000001-0000-0000-0000-000000000001','a1b2c3d4-0000-0000-0000-000000000001','Juan','Dela Cruz','1985-03-12','123 Mabini St., Calamba City','09171234567','juan.delacruz@email.com'),
  ('d0000001-0000-0000-0000-000000000002','a1b2c3d4-0000-0000-0000-000000000001','Maria','Gonzales','1990-07-25','456 Rizal Ave., Los Baños','09182345678','mariag@email.com'),
  ('d0000001-0000-0000-0000-000000000003','a1b2c3d4-0000-0000-0000-000000000001','Pedro','Bautista','1978-11-03','789 Bonifacio Blvd., Cabuyao','09193456789','pbautista@email.com'),
  ('d0000001-0000-0000-0000-000000000004','a1b2c3d4-0000-0000-0000-000000000001','Ana','Reyes','1995-01-15','321 Luna St., Santa Rosa','09204567890','ana.reyes@email.com'),
  ('d0000001-0000-0000-0000-000000000005','a1b2c3d4-0000-0000-0000-000000000001','Carlo','Mendoza','2001-06-28','654 Aguinaldo St., Biñan','09215678901','carlo.m@email.com'),
  ('d0000001-0000-0000-0000-000000000006','a1b2c3d4-0000-0000-0000-000000000001','Liza','Fernandez','1988-09-10','987 Del Pilar St., San Pablo','09226789012','lizaf@email.com'),
  ('d0000001-0000-0000-0000-000000000007','a1b2c3d4-0000-0000-0000-000000000001','Mark','Tolentino','1973-04-22','147 Osias Rd., Calauan','09237890123','markt@email.com'),
  ('d0000001-0000-0000-0000-000000000008','a1b2c3d4-0000-0000-0000-000000000001','Grace','Pascual','1992-12-05','258 Quezon Ave., Alaminos','09248901234','gracep@email.com'),
  ('d0000001-0000-0000-0000-000000000009','a1b2c3d4-0000-0000-0000-000000000001','Roberto','Aquino','1968-08-17','369 MacArthur Hwy., Victoria','09259012345','rob.aquino@email.com'),
  ('d0000001-0000-0000-0000-000000000010','a1b2c3d4-0000-0000-0000-000000000001','Joanna','Ramos','1998-02-28','741 Zamora St., Bay','09260123456','joanna.r@email.com'),
  ('d0000001-0000-0000-0000-000000000011','a1b2c3d4-0000-0000-0000-000000000001','Eduardo','Castro','1981-05-14','852 Pacita Complex, San Pedro','09271234567','edu.castro@email.com'),
  ('d0000001-0000-0000-0000-000000000012','a1b2c3d4-0000-0000-0000-000000000001','Cristina','Soriano','2003-10-19','963 Brgy. Real, Calamba','09282345678','cris.soriano@email.com'),
  ('d0000001-0000-0000-0000-000000000013','a1b2c3d4-0000-0000-0000-000000000001','Rodrigo','Magno','1960-03-30','159 Kapitan Moy Rd., Pagsanjan','09293456789','rod.magno@email.com'),
  ('d0000001-0000-0000-0000-000000000014','a1b2c3d4-0000-0000-0000-000000000001','Stephanie','Lim','2000-07-07','357 Brgy. Parian, Calamba','09304567890','steph.lim@email.com'),
  ('d0000001-0000-0000-0000-000000000015','a1b2c3d4-0000-0000-0000-000000000001','Antonio','Navarro','1975-11-25','486 Crossing, Santa Cruz','09315678901','tony.navarro@email.com');

-- 5. APPOINTMENTS (20 appointments spread across current week)
-- Note: Using relative dates so the data is always "this week"
INSERT INTO appointments (id, clinic_id, patient_id, dentist_id, treatment_type, appointment_date, appointment_time, status, notes)
VALUES
  -- Monday
  ('e0000001-0000-0000-0000-000000000001','a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','Dental Cleaning', CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int + 1, '09:00', 'Done', 'Routine cleaning, no issues'),
  ('e0000001-0000-0000-0000-000000000002','a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000002','Braces Adjustment', CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int + 1, '10:30', 'Done', 'Month 4 adjustment'),
  ('e0000001-0000-0000-0000-000000000003','a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000001','Tooth Extraction', CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int + 1, '14:00', 'Done', 'Lower left molar'),
  -- Tuesday
  ('e0000001-0000-0000-0000-000000000004','a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000004','c1000000-0000-0000-0000-000000000001','Tooth Filling', CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int + 2, '09:00', 'Done', 'Composite filling, tooth #14'),
  ('e0000001-0000-0000-0000-000000000005','a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000005','c1000000-0000-0000-0000-000000000003','Wisdom Tooth Surgery', CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int + 2, '10:00', 'Done', 'Upper right impacted'),
  ('e0000001-0000-0000-0000-000000000006','a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000006','c1000000-0000-0000-0000-000000000001','Dental Cleaning', CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int + 2, '13:00', 'No-show', NULL),
  -- Wednesday
  ('e0000001-0000-0000-0000-000000000007','a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000007','c1000000-0000-0000-0000-000000000001','Root Canal', CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int + 3, '09:30', 'Confirmed', 'Second session'),
  ('e0000001-0000-0000-0000-000000000008','a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000008','c1000000-0000-0000-0000-000000000002','Braces Consultation', CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int + 3, '11:00', 'Scheduled', NULL),
  ('e0000001-0000-0000-0000-000000000009','a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000009','c1000000-0000-0000-0000-000000000001','Tooth Extraction', CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int + 3, '14:00', 'Scheduled', 'Patient is nervous, needs extra care'),
  ('e0000001-0000-0000-0000-000000000010','a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000010','c1000000-0000-0000-0000-000000000001','Dental Cleaning', CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int + 3, '15:30', 'Scheduled', NULL),
  -- Thursday
  ('e0000001-0000-0000-0000-000000000011','a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000011','c1000000-0000-0000-0000-000000000001','Tooth Filling', CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int + 4, '09:00', 'Scheduled', NULL),
  ('e0000001-0000-0000-0000-000000000012','a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000012','c1000000-0000-0000-0000-000000000002','Braces Adjustment', CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int + 4, '10:00', 'Confirmed', 'Month 2 adjustment'),
  ('e0000001-0000-0000-0000-000000000013','a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000013','c1000000-0000-0000-0000-000000000003','Oral Surgery Consult', CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int + 4, '11:30', 'Scheduled', 'Pre-op evaluation'),
  ('e0000001-0000-0000-0000-000000000014','a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000014','c1000000-0000-0000-0000-000000000001','Dental Cleaning', CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int + 4, '14:00', 'Scheduled', NULL),
  -- Friday
  ('e0000001-0000-0000-0000-000000000015','a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000015','c1000000-0000-0000-0000-000000000001','Root Canal', CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int + 5, '09:00', 'Scheduled', 'Final session'),
  ('e0000001-0000-0000-0000-000000000016','a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000002','Retainer Check', CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int + 5, '10:30', 'Scheduled', NULL),
  ('e0000001-0000-0000-0000-000000000017','a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000001','Tooth Filling', CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int + 5, '13:00', 'Scheduled', NULL),
  ('e0000001-0000-0000-0000-000000000018','a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000003','c1000000-0000-0000-0000-000000000001','Dental X-ray', CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int + 5, '14:00', 'Confirmed', NULL),
  -- Saturday
  ('e0000001-0000-0000-0000-000000000019','a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000004','c1000000-0000-0000-0000-000000000003','Tooth Extraction', CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int + 6, '09:00', 'Scheduled', NULL),
  ('e0000001-0000-0000-0000-000000000020','a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000005','c1000000-0000-0000-0000-000000000003','Wisdom Tooth Surgery', CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int + 6, '11:00', 'Scheduled', NULL);

-- 6. VISIT NOTES
INSERT INTO visit_notes (patient_id, appointment_id, notes)
VALUES
  ('d0000001-0000-0000-0000-000000000001','e0000001-0000-0000-0000-000000000001','Routine prophylaxis completed. Slight calculus buildup on lower anterior. Recommended brushing improvement and flossing.'),
  ('d0000001-0000-0000-0000-000000000002','e0000001-0000-0000-0000-000000000002','Month 4 wire change. Patient reports mild discomfort. Took Mefenamic Acid. Next visit in 4 weeks.'),
  ('d0000001-0000-0000-0000-000000000003','e0000001-0000-0000-0000-000000000003','Extraction of lower left 2nd molar under local anesthesia. Hemostasis achieved. Post-op instructions given.'),
  ('d0000001-0000-0000-0000-000000000004','e0000001-0000-0000-0000-000000000004','Composite restoration tooth #14. Color A2 matched. Patient satisfied with result.'),
  ('d0000001-0000-0000-0000-000000000005','e0000001-0000-0000-0000-000000000005','Surgical extraction of upper right wisdom tooth. No complications. Prescribed Amoxicillin 500mg TID for 5 days.');

-- 7. INVENTORY ITEMS (10 items, 3 below reorder level)
INSERT INTO inventory_items (clinic_id, item_name, category, quantity, unit, reorder_level, last_restocked)
VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001','Dental Gloves (Medium)','PPE',150,'box',20,'2024-01-10'),
  ('a1b2c3d4-0000-0000-0000-000000000001','Face Masks','PPE',200,'pcs',50,'2024-01-10'),
  ('a1b2c3d4-0000-0000-0000-000000000001','Composite Resin (A2)','Restorative',8,'syringe',10,'2023-12-20'), -- BELOW REORDER
  ('a1b2c3d4-0000-0000-0000-000000000001','Dental Anesthetic (Lidocaine)','Anesthesia',5,'vial',15,'2023-12-01'), -- BELOW REORDER
  ('a1b2c3d4-0000-0000-0000-000000000001','Cotton Rolls','Consumable',500,'pcs',100,'2024-01-05'),
  ('a1b2c3d4-0000-0000-0000-000000000001','Suture Thread 3-0','Surgical',3,'pack',10,'2023-11-15'), -- BELOW REORDER
  ('a1b2c3d4-0000-0000-0000-000000000001','Dental X-ray Film','Imaging',80,'sheets',30,'2024-01-08'),
  ('a1b2c3d4-0000-0000-0000-000000000001','Mouth Mirror (Autoclavable)','Instruments',25,'pcs',10,'2023-10-20'),
  ('a1b2c3d4-0000-0000-0000-000000000001','Dental Floss','Hygiene',120,'rolls',50,'2024-01-12'),
  ('a1b2c3d4-0000-0000-0000-000000000001','Hydrogen Peroxide 3%','Antiseptic',15,'bottle',5,'2024-01-03');

-- 8. BILLING
INSERT INTO billing (clinic_id, patient_id, appointment_id, treatment_description, amount_charged)
VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000001','e0000001-0000-0000-0000-000000000001','Dental Cleaning / Prophylaxis',1500.00),
  ('a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000002','e0000001-0000-0000-0000-000000000002','Braces Adjustment Fee',800.00),
  ('a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000003','e0000001-0000-0000-0000-000000000003','Tooth Extraction - Molar',2500.00),
  ('a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000004','e0000001-0000-0000-0000-000000000004','Composite Filling - 1 Surface',3000.00),
  ('a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000005','e0000001-0000-0000-0000-000000000005','Wisdom Tooth Surgical Extraction',8000.00),
  ('a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000006',NULL,'Dental Cleaning / Prophylaxis',1500.00),
  ('a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000007',NULL,'Root Canal Treatment - Molar (Session 1)',5000.00),
  ('a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000008',NULL,'Braces Consultation',500.00);

-- 9. PAYMENTS
INSERT INTO payments (clinic_id, patient_id, amount_paid, payment_method, payment_date)
VALUES
  ('a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000001',1500.00,'Cash', CURRENT_DATE - 4),
  ('a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000002',800.00,'GCash', CURRENT_DATE - 4),
  ('a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000003',1500.00,'Cash', CURRENT_DATE - 3), -- partial
  ('a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000004',3000.00,'Maya', CURRENT_DATE - 3),
  ('a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000005',5000.00,'Card', CURRENT_DATE - 3), -- partial
  ('a1b2c3d4-0000-0000-0000-000000000001','d0000001-0000-0000-0000-000000000007',2500.00,'GCash', CURRENT_DATE - 2); -- partial root canal
