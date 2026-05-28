-- Cherolee Core V1 controlled financial adjustment write function.
--
-- Business rule:
--   * Deposits and payments remain handled only by core_record_reservation_payment.
--   * Financial exceptions are additive ledger rows; prior ledger rows are not edited or deleted.
--   * The caller chooses an allowed entry_type, but the function owns balance_effect mapping.
--   * Refunds and chargebacks here are internal ledger records only. No payment processor is connected.
--
-- Migration caution:
--   * This does not build UI, connect a payment processor, send email, create documents,
--     enable RLS, import production data, or implement processor-grade reconciliation.
--   * Function-level duplicate external_reference checks are local/development protection only.
--     Live payment/refund/chargeback reconciliation requires later schema and idempotency work.

create or replace function public.core_record_financial_adjustment(
  p_reservation_id uuid,
  p_actor_profile_id uuid,
  p_entry_type text,
  p_amount_cents integer,
  p_reason text,
  p_external_reference text default null,
  p_related_ledger_id uuid default null,
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
  v_related_ledger public.core_financial_ledger%rowtype;
  v_ledger public.core_financial_ledger%rowtype;
  v_event_id uuid;
  v_audit_log_id uuid;
  v_balance_due_cents integer;
  v_actor_name text;
  v_entry_type text;
  v_balance_effect text;
  v_reason text;
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
  v_balance_effect := case
    when v_entry_type = 'credit' then 'decrease'
    when v_entry_type in ('refund', 'chargeback', 'fee', 'admin_fee', 'transport_fee', 'finance_charge') then 'increase'
    when v_entry_type = 'adjustment' then 'neutral'
    else null
  end;

  if v_balance_effect is null then
    raise exception 'entry_type must be credit, refund, chargeback, fee, admin_fee, transport_fee, finance_charge, or adjustment';
  end if;

  if v_entry_type = 'adjustment' then
    if p_amount_cents is null or p_amount_cents < 0 then
      raise exception 'neutral adjustment amount_cents must be zero or greater';
    end if;
  elsif p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'amount_cents must be greater than zero';
  end if;

  v_reason := nullif(btrim(p_reason), '');
  if v_reason is null then
    raise exception 'reason is required';
  end if;

  if length(v_reason) > 1000 then
    raise exception 'reason must be 1000 characters or fewer';
  end if;

  v_external_reference := nullif(btrim(p_external_reference), '');
  v_notes := nullif(btrim(p_notes), '');

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

  select display_name
  into v_actor_name
  from public.core_profiles
  where id = p_actor_profile_id;

  if v_actor_name is null then
    raise exception 'actor profile % was not found', p_actor_profile_id;
  end if;

  if p_related_ledger_id is not null then
    select *
    into v_related_ledger
    from public.core_financial_ledger
    where id = p_related_ledger_id;

    if not found then
      raise exception 'related ledger % was not found', p_related_ledger_id;
    end if;

    if v_related_ledger.reservation_id is distinct from v_reservation.id then
      raise exception 'related ledger % does not belong to reservation %', p_related_ledger_id, p_reservation_id;
    end if;
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
    description,
    metadata
  ) values (
    v_reservation.id,
    v_reservation.buyer_id,
    v_external_reference,
    v_entry_type,
    v_balance_effect,
    'posted',
    p_amount_cents,
    v_reservation.currency,
    now(),
    v_reason,
    jsonb_build_object(
      'created_by_tool', 'core_record_financial_adjustment',
      'recording_mode', 'local_dev_controlled',
      'reason', v_reason,
      'notes', v_notes,
      'related_ledger_id', p_related_ledger_id,
      'processor_connected', false
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
    'reservation_financial_adjustment_recorded',
    now(),
    concat(initcap(replace(v_entry_type, '_', ' ')), ' recorded by ', v_actor_name),
    v_reservation.family_id,
    v_reservation.buyer_id,
    v_reservation.application_id,
    v_reservation.puppy_id,
    v_reservation.id,
    'core_financial_ledger',
    v_ledger.id,
    'core_record_financial_adjustment',
    jsonb_build_object(
      'entry_type', v_entry_type,
      'amount_cents', p_amount_cents,
      'balance_effect', v_balance_effect,
      'reason', v_reason,
      'external_reference', v_external_reference,
      'related_ledger_id', p_related_ledger_id,
      'processor_connected', false
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
    'core_record_financial_adjustment',
    'record_financial_adjustment',
    'core_financial_ledger',
    v_ledger.id,
    null,
    to_jsonb(v_ledger),
    jsonb_build_object(
      'reservation_id', v_reservation.id,
      'entry_type', v_entry_type,
      'amount_cents', p_amount_cents,
      'balance_effect', v_balance_effect,
      'reason', v_reason,
      'external_reference_provided', v_external_reference is not null,
      'related_ledger_id', p_related_ledger_id,
      'processor_connected', false
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

comment on function public.core_record_financial_adjustment(uuid, uuid, text, integer, text, text, uuid, text) is
  'Controlled local/development financial adjustment foundation. Records only allowlisted additive ledger exceptions, maps balance_effect internally, writes event/audit records, and does not connect to a payment processor.';
