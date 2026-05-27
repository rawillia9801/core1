-- Cherolee Core V1 controlled deposit/payment ledger write function.
--
-- Business rule:
--   * A reservation ledger entry is the official record of recorded money activity.
--   * This first financial write tool supports only posted deposits and payments.
--   * Deposits and payments always reduce amount owed through balance_effect = 'decrease'.
--   * Core changes must happen through validated write tools with event/audit records.
--
-- Migration caution:
--   * This does not connect a payment processor, send receipts/email, create documents,
--     enable RLS, import production data, or implement refunds/fees/chargebacks.
--   * Duplicate external references are rejected within this controlled function while
--     its reservation row is locked. Future processor reconciliation requires a
--     separately reviewed idempotency design before live payment integration.

create or replace function public.core_record_reservation_payment(
  p_reservation_id uuid,
  p_actor_profile_id uuid,
  p_entry_type text,
  p_amount_cents integer,
  p_payment_method text default null,
  p_external_reference text default null,
  p_notes text default null
)
returns table (
  ledger_id uuid,
  reservation_id uuid,
  buyer_id uuid,
  entry_type text,
  amount_cents integer,
  balance_effect text,
  balance_due_cents integer,
  event_id uuid,
  audit_log_id uuid
)
language plpgsql
security invoker
as $$
declare
  v_reservation public.core_reservations%rowtype;
  v_ledger public.core_financial_ledger%rowtype;
  v_event_id uuid;
  v_audit_log_id uuid;
  v_balance_due_cents integer;
  v_actor_name text;
  v_entry_type text;
  v_payment_method text;
  v_external_reference text;
  v_notes text;
begin
  if p_reservation_id is null then
    raise exception 'reservation_id is required';
  end if;

  if p_actor_profile_id is null then
    raise exception 'actor_profile_id is required';
  end if;

  v_entry_type := lower(btrim(coalesce(p_entry_type, '')));
  if v_entry_type not in ('deposit', 'payment') then
    raise exception 'entry_type must be deposit or payment';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'amount_cents must be greater than zero';
  end if;

  v_payment_method := nullif(btrim(p_payment_method), '');
  v_external_reference := nullif(btrim(p_external_reference), '');
  v_notes := nullif(btrim(p_notes), '');

  if length(coalesce(v_payment_method, '')) > 100 then
    raise exception 'payment_method must be 100 characters or fewer';
  end if;

  if length(coalesce(v_external_reference, '')) > 255 then
    raise exception 'external_reference must be 255 characters or fewer';
  end if;

  if length(coalesce(v_notes, '')) > 1000 then
    raise exception 'notes must be 1000 characters or fewer';
  end if;

  select *
  into v_reservation
  from public.core_reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'reservation % was not found', p_reservation_id;
  end if;

  if v_reservation.buyer_id is null then
    raise exception 'reservation % has no linked buyer', p_reservation_id;
  end if;

  if v_reservation.status in ('cancelled', 'void', 'released') then
    raise exception 'reservation % is not eligible for payment recording in status %', p_reservation_id, v_reservation.status;
  end if;

  select display_name
  into v_actor_name
  from public.core_profiles
  where id = p_actor_profile_id;

  if v_actor_name is null then
    raise exception 'actor profile % was not found', p_actor_profile_id;
  end if;

  if v_external_reference is not null and exists (
    select 1
    from public.core_financial_ledger l
    where l.reservation_id = p_reservation_id
      and l.entry_type = v_entry_type
      and l.amount_cents = p_amount_cents
      and l.external_reference = v_external_reference
      and l.status = 'posted'
  ) then
    raise exception 'duplicate posted % reference % for reservation %', v_entry_type, v_external_reference, p_reservation_id;
  end if;

  insert into public.core_financial_ledger (
    reservation_id,
    buyer_id,
    external_reference,
    entry_type,
    balance_effect,
    status,
    amount_cents,
    currency,
    occurred_at,
    payment_method,
    description,
    metadata
  ) values (
    v_reservation.id,
    v_reservation.buyer_id,
    v_external_reference,
    v_entry_type,
    'decrease',
    'posted',
    p_amount_cents,
    v_reservation.currency,
    now(),
    v_payment_method,
    v_notes,
    jsonb_build_object(
      'created_by_tool', 'core_record_reservation_payment',
      'recording_mode', 'local_dev_controlled'
    )
  ) returning * into v_ledger;

  select pb.balance_due_cents
  into v_balance_due_cents
  from public.core_payment_balance_view pb
  where pb.reservation_id = v_reservation.id;

  insert into public.core_events (
    event_type,
    event_at,
    summary,
    family_id,
    buyer_id,
    application_id,
    puppy_id,
    reservation_id,
    related_table,
    related_id,
    source,
    details,
    created_by_profile_id
  ) values (
    'reservation_payment_recorded',
    now(),
    concat(initcap(v_entry_type), ' recorded by ', v_actor_name),
    v_reservation.family_id,
    v_reservation.buyer_id,
    v_reservation.application_id,
    v_reservation.puppy_id,
    v_reservation.id,
    'core_financial_ledger',
    v_ledger.id,
    'core_record_reservation_payment',
    jsonb_build_object(
      'entry_type', v_entry_type,
      'amount_cents', p_amount_cents,
      'balance_effect', 'decrease',
      'payment_method', v_payment_method,
      'external_reference', v_external_reference
    ),
    p_actor_profile_id
  ) returning id into v_event_id;

  insert into public.core_audit_log (
    actor_type,
    actor_profile_id,
    actor_identifier,
    source,
    action,
    entity_table,
    entity_id,
    old_data,
    new_data,
    request_context,
    outcome
  ) values (
    'profile',
    p_actor_profile_id,
    v_actor_name,
    'core_record_reservation_payment',
    'record_reservation_payment',
    'core_financial_ledger',
    v_ledger.id,
    null,
    to_jsonb(v_ledger),
    jsonb_build_object(
      'reservation_id', v_reservation.id,
      'entry_type', v_entry_type,
      'balance_effect', 'decrease',
      'external_reference_provided', v_external_reference is not null
    ),
    'success'
  ) returning id into v_audit_log_id;

  ledger_id := v_ledger.id;
  reservation_id := v_reservation.id;
  buyer_id := v_reservation.buyer_id;
  entry_type := v_entry_type;
  amount_cents := v_ledger.amount_cents;
  balance_effect := v_ledger.balance_effect;
  balance_due_cents := v_balance_due_cents;
  event_id := v_event_id;
  audit_log_id := v_audit_log_id;
  return next;
end;
$$;

comment on function public.core_record_reservation_payment(uuid, uuid, text, integer, text, text, text) is
  'Controlled local/development deposit/payment ledger write foundation. Records only posted decreases, writes event/audit records, and does not connect to a payment processor.';
