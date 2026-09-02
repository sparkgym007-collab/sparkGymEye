alter table auth_session
add column if not exists effective_role varchar(32);

update auth_session session
set effective_role = app_user.role
from app_user
where session.app_user_id = app_user.id
  and session.effective_role is null;

alter table auth_session
alter column effective_role set default 'MEMBER';

alter table auth_session
alter column effective_role set not null;
