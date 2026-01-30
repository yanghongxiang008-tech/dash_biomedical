-- Migrate Notion API key from 1102292387@qq.com to zezhou.t@foxmail.com
UPDATE profiles 
SET notion_api_key = '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'
WHERE email = 'zezhou.t@foxmail.com';