-- Phase 8: journal posting for credit/debit notes - the exact reverse of a
-- sales/purchase invoice posting. Written with the corrected finalization
-- signal from the start (Phase 7 Gotcha #10): create_credit_note/create_debit_note
-- insert their header row before totals are known, then a final UPDATE fills
-- them in, so posting fires on that UPDATE (OLD.total_amount = 0, NEW <> 0),
-- not on INSERT.

create or replace function public.post_credit_note_journal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_gst_amt numeric;
begin
  if (TG_OP = 'INSERT' and NEW.status = 'active' and coalesce(NEW.total_amount, 0) <> 0)
     or (TG_OP = 'UPDATE' and OLD.status = 'active' and NEW.status = 'active'
         and coalesce(OLD.total_amount, 0) = 0 and coalesce(NEW.total_amount, 0) <> 0) then
    v_gst_amt := coalesce(NEW.cgst_total, 0) + coalesce(NEW.sgst_total, 0) + coalesce(NEW.igst_total, 0);

    insert into public.journal_entries (entry_date, description, source_table, source_id, created_by)
    values (NEW.credit_note_date, 'Credit Note ' || NEW.credit_note_number, 'credit_notes', NEW.id, NEW.created_by)
    returning id into v_entry_id;

    insert into public.journal_entry_lines (entry_id, account_id, debit_amount, credit_amount) values
      (v_entry_id, public.coa_id('4000'), coalesce(NEW.taxable_total, 0), 0),
      (v_entry_id, public.coa_id('2100'), v_gst_amt, 0),
      (v_entry_id, public.coa_id('1100'), 0, NEW.total_amount);

  elsif TG_OP = 'UPDATE' and OLD.status = 'active' and NEW.status = 'cancelled' then
    v_gst_amt := coalesce(NEW.cgst_total, 0) + coalesce(NEW.sgst_total, 0) + coalesce(NEW.igst_total, 0);

    insert into public.journal_entries (entry_date, description, source_table, source_id, created_by)
    values (current_date, 'Cancel Credit Note ' || NEW.credit_note_number, 'credit_notes', NEW.id, NEW.updated_by)
    returning id into v_entry_id;

    insert into public.journal_entry_lines (entry_id, account_id, debit_amount, credit_amount) values
      (v_entry_id, public.coa_id('4000'), 0, coalesce(NEW.taxable_total, 0)),
      (v_entry_id, public.coa_id('2100'), 0, v_gst_amt),
      (v_entry_id, public.coa_id('1100'), NEW.total_amount, 0);
  end if;
  return NEW;
end;
$$;

create trigger credit_notes_journal
after insert or update on public.credit_notes
for each row execute function public.post_credit_note_journal();

create or replace function public.post_debit_note_journal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_gst_amt numeric;
begin
  if (TG_OP = 'INSERT' and NEW.status = 'active' and coalesce(NEW.total_amount, 0) <> 0)
     or (TG_OP = 'UPDATE' and OLD.status = 'active' and NEW.status = 'active'
         and coalesce(OLD.total_amount, 0) = 0 and coalesce(NEW.total_amount, 0) <> 0) then
    v_gst_amt := coalesce(NEW.cgst_total, 0) + coalesce(NEW.sgst_total, 0) + coalesce(NEW.igst_total, 0);

    insert into public.journal_entries (entry_date, description, source_table, source_id, created_by)
    values (NEW.debit_note_date, 'Debit Note ' || NEW.debit_note_number, 'debit_notes', NEW.id, NEW.created_by)
    returning id into v_entry_id;

    insert into public.journal_entry_lines (entry_id, account_id, debit_amount, credit_amount) values
      (v_entry_id, public.coa_id('2000'), NEW.total_amount, 0),
      (v_entry_id, public.coa_id('1200'), 0, coalesce(NEW.taxable_total, 0)),
      (v_entry_id, public.coa_id('1300'), 0, v_gst_amt);

  elsif TG_OP = 'UPDATE' and OLD.status = 'active' and NEW.status = 'cancelled' then
    v_gst_amt := coalesce(NEW.cgst_total, 0) + coalesce(NEW.sgst_total, 0) + coalesce(NEW.igst_total, 0);

    insert into public.journal_entries (entry_date, description, source_table, source_id, created_by)
    values (current_date, 'Cancel Debit Note ' || NEW.debit_note_number, 'debit_notes', NEW.id, NEW.updated_by)
    returning id into v_entry_id;

    insert into public.journal_entry_lines (entry_id, account_id, debit_amount, credit_amount) values
      (v_entry_id, public.coa_id('2000'), 0, NEW.total_amount),
      (v_entry_id, public.coa_id('1200'), coalesce(NEW.taxable_total, 0), 0),
      (v_entry_id, public.coa_id('1300'), v_gst_amt, 0);
  end if;
  return NEW;
end;
$$;

create trigger debit_notes_journal
after insert or update on public.debit_notes
for each row execute function public.post_debit_note_journal();
