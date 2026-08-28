alter table app_user drop column if exists reset_token_hash;
alter table app_user drop column if exists reset_token_expires_at;
