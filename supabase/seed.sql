-- Run this in Supabase SQL Editor AFTER running schema.sql

-- Insert Staff Members for Renwal Hospital
INSERT INTO staff_members (id, name, role, pin_hash, clinic_access, joined_at)
VALUES 
  -- Doctors
  ('doc-ortho', 'Dr. R P Samota', 'doctor', crypt('1111', gen_salt('bf')), '{ortho}', NOW()),
  ('doc-surgery', 'Dr. M L Didel', 'doctor', crypt('2222', gen_salt('bf')), '{surgery}', NOW()),
  ('doc-medicine', 'Dr. Rajesh Bochaliya', 'doctor', crypt('3333', gen_salt('bf')), '{medicine}', NOW()),
  ('doc-urology', 'Dr. Nishkarsh Mehta', 'doctor', crypt('4444', gen_salt('bf')), '{urology}', NOW()),
  ('doc-anaesthesia', 'Dr. Pankaj Saini', 'doctor', crypt('5555', gen_salt('bf')), '{anaesthesia}', NOW()),
  
  -- Receptionist
  ('receptionist', 'Reception Desk', 'staff', crypt('9999', gen_salt('bf')), '{ortho,surgery,medicine,urology,anaesthesia}', NOW());
