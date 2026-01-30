-- Transfer deals from 1102292387@qq.com to zezhou.t@foxmail.com
UPDATE deals 
SET user_id = '2563d0cf-2b50-40ef-bb3e-07f347616664'
WHERE user_id = '4fc9a5a5-89b7-414d-a0d3-c11ce3d3aa55';

-- Transfer contacts
UPDATE contacts 
SET user_id = '2563d0cf-2b50-40ef-bb3e-07f347616664'
WHERE user_id = '4fc9a5a5-89b7-414d-a0d3-c11ce3d3aa55';

-- Transfer interactions
UPDATE interactions 
SET user_id = '2563d0cf-2b50-40ef-bb3e-07f347616664'
WHERE user_id = '4fc9a5a5-89b7-414d-a0d3-c11ce3d3aa55';

-- Transfer deal_analyses
UPDATE deal_analyses 
SET user_id = '2563d0cf-2b50-40ef-bb3e-07f347616664'
WHERE user_id = '4fc9a5a5-89b7-414d-a0d3-c11ce3d3aa55';