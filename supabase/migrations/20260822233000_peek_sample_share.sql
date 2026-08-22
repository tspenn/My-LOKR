-- Anyone can read the sample locker. Writing still requires an account.
-- This is the real locker, not a fake app.

create or replace function public.lokr_peek_sample_inbox()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  workspace_id uuid;
  locker_name text;
  inbox jsonb;
begin
  workspace_id := public.lokr_sample_workspace_id();
  if workspace_id is null then
    return jsonb_build_object('ok', false, 'error', 'This share is not open yet.');
  end if;

  select w.name into locker_name
  from public.lokr_workspaces w
  where w.id = workspace_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'subject', c.subject,
        'created_at', c.created_at,
        'updated_at', c.updated_at,
        'last_message_body', lm.body,
        'last_message_at', lm.created_at,
        'unread_count', 0,
        'members', (
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'id', p.id,
                'display_name', coalesce(nullif(p.full_name, ''), 'Someone'),
                'email', '',
                'avatar_url', p.avatar_url
              )
              order by coalesce(p.full_name, p.email)
            ),
            '[]'::jsonb
          )
          from public.lokr_conversation_members as cm
          join public.profiles as p on p.id = cm.user_id
          where cm.conversation_id = c.id
        )
      )
      order by c.updated_at desc
    ),
    '[]'::jsonb
  )
  into inbox
  from public.lokr_conversations as c
  left join lateral (
    select m.body, m.created_at
    from public.lokr_messages as m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) as lm on true
  where c.workspace_id = workspace_id;

  return jsonb_build_object(
    'ok', true,
    'workspace_id', workspace_id,
    'name', locker_name,
    'inbox', inbox
  );
end;
$$;

create or replace function public.lokr_peek_sample_conversation(p_conversation_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  workspace_id uuid;
  conversation public.lokr_conversations%rowtype;
  members jsonb;
  messages jsonb;
begin
  workspace_id := public.lokr_sample_workspace_id();
  if workspace_id is null or p_conversation_id is null then
    return jsonb_build_object('ok', false, 'error', 'This share is not open yet.');
  end if;

  select * into conversation
  from public.lokr_conversations c
  where c.id = p_conversation_id
    and c.workspace_id = workspace_id;
  if conversation.id is null then
    return jsonb_build_object('ok', false, 'error', 'That conversation is not in this locker.');
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'display_name', coalesce(nullif(p.full_name, ''), 'Someone'),
        'email', '',
        'avatar_url', p.avatar_url
      )
      order by coalesce(p.full_name, p.email)
    ),
    '[]'::jsonb
  )
  into members
  from public.lokr_conversation_members as cm
  join public.profiles as p on p.id = cm.user_id
  where cm.conversation_id = conversation.id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'conversation_id', m.conversation_id,
        'sender_id', m.sender_id,
        'body', m.body,
        'created_at', m.created_at,
        'updated_at', m.updated_at,
        'sender', jsonb_build_object(
          'id', p.id,
          'email', '',
          'display_name', coalesce(nullif(p.full_name, ''), 'Someone'),
          'avatar_url', p.avatar_url,
          'created_at', m.created_at,
          'updated_at', m.updated_at
        ),
        'message_attachments', '[]'::jsonb
      )
      order by m.created_at
    ),
    '[]'::jsonb
  )
  into messages
  from public.lokr_messages as m
  left join public.profiles as p on p.id = m.sender_id
  where m.conversation_id = conversation.id;

  return jsonb_build_object(
    'ok', true,
    'workspace_id', workspace_id,
    'subject', conversation.subject,
    'members', members,
    'messages', messages
  );
end;
$$;

revoke all on function public.lokr_peek_sample_inbox() from public;
revoke all on function public.lokr_peek_sample_conversation(uuid) from public;
grant execute on function public.lokr_peek_sample_inbox() to anon, authenticated;
grant execute on function public.lokr_peek_sample_conversation(uuid) to anon, authenticated;
