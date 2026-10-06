-- Run after schema.sql as project owner in SQL Editor.
-- Exact existing portfolio facts; VLSI is the one user-requested addition.
-- Fixed UUIDs + ON CONFLICT DO NOTHING make reruns preserve dashboard edits.
-- Run this once for initial setup; rerunning after intentional deletion can
-- restore deleted initial rows. No skill levels or project dates are invented.
begin;

insert into public.skills (id, name, category, level, display_order) values
  ('10000000-0000-4000-8000-000000000001','Java','programming',null,0),
  ('10000000-0000-4000-8000-000000000002','Python','programming',null,1),
  ('10000000-0000-4000-8000-000000000003','C','programming',null,2),
  ('10000000-0000-4000-8000-000000000004','SQL','programming',null,3),
  ('10000000-0000-4000-8000-000000000005','Data structures','programming',null,4),
  ('10000000-0000-4000-8000-000000000006','FreeRTOS concepts','technical',null,0),
  ('10000000-0000-4000-8000-000000000007','Sensor data acquisition','technical',null,1),
  ('10000000-0000-4000-8000-000000000008','Sensor data processing','technical',null,2),
  ('10000000-0000-4000-8000-000000000009','IoT communication protocols','technical',null,3),
  ('10000000-0000-4000-8000-000000000010','Hardware security','technical',null,4),
  ('10000000-0000-4000-8000-000000000019','VLSI','technical',null,5),
  ('10000000-0000-4000-8000-000000000011','Data analytics','data',null,0),
  ('10000000-0000-4000-8000-000000000012','Power BI','data',null,1),
  ('10000000-0000-4000-8000-000000000013','Tableau','data',null,2),
  ('10000000-0000-4000-8000-000000000014','KPI reporting','data',null,3),
  ('10000000-0000-4000-8000-000000000015','Arduino IDE','tools',null,0),
  ('10000000-0000-4000-8000-000000000016','GitHub','tools',null,1),
  ('10000000-0000-4000-8000-000000000017','MS Office','tools',null,2),
  ('10000000-0000-4000-8000-000000000018','MATLAB basics','tools',null,3)
on conflict (id) do nothing;

insert into public.projects (
  id,title,short_description,full_description,technologies,github_url,demo_url,image_path,status,display_order
) values (
  '20000000-0000-4000-8000-000000000001',
  'Solar PV Plant Analysis',
  'A Power BI project focused on the analysis of a solar photovoltaic plant, bringing an engineering subject into a data analytics workflow.',
  'Detailed features, dataset, and outcomes: to be added.',
  array['Power BI','Solar photovoltaic systems','Data analysis'],
  null,null,null,'unspecified',0
)
on conflict (id) do nothing;

-- Prepared future-section data. The first admin version exposes a scaffold
-- for these sections; it does not yet offer their CRUD screens.
insert into public.certifications (id,title,issuer,description,score,recognition,display_order) values (
  '30000000-0000-4000-8000-000000000001',
  'Introduction to Adaptive Signal Processing',
  'NPTEL · IIT Kharagpur',
  '8-week course · Completion date: to be added',
  65,'Elite',0
)
on conflict (id) do nothing;

insert into public.experiences (id,title,organization,description,technologies,display_order) values
  ('40000000-0000-4000-8000-000000000001',
   'Embedded Systems Intern','Codtech IT Solutions Private Limited',
   'Programmed real-time embedded systems using FreeRTOS concepts, with sensor data acquisition, processing, and communication protocols for IoT monitoring applications.',
   array['FreeRTOS concepts','Sensor data','IoT monitoring'],0),
  ('40000000-0000-4000-8000-000000000002',
   'Data Analytics Intern','Feather Softwares',
   'Built and published interactive Power BI and Tableau dashboards to track key performance indicators and communicate business performance to stakeholders.',
   array['Power BI','Tableau','KPI dashboards'],1)
on conflict (id) do nothing;

insert into public.achievements (id,title,description,recognition,display_order) values
  ('50000000-0000-4000-8000-000000000001','Academic performance',
   'CGPA in Electronics and Communication Engineering at V.S.B. College of Engineering Technical Campus.',
   '9.45/10',0),
  ('50000000-0000-4000-8000-000000000002','NPTEL distinction',
   'Earned the Elite designation in Introduction to Adaptive Signal Processing from IIT Kharagpur.',
   'Elite',1)
on conflict (id) do nothing;

commit;
