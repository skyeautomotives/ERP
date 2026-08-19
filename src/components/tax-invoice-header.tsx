import { gstStateCode } from "@/lib/gst-state-codes";

type Company = {
  name: string;
  address: string | null;
  gstin: string | null;
  phone: string | null;
  state: string | null;
  logo_url: string | null;
};

type Party = {
  name: string;
  address: string | null;
  phone: string | null;
  state: string | null;
  gstin: string | null;
};

// Matches the structure of the business's own paper invoice format (GSTIN/
// State top corners, centered company block, a bordered document-type label,
// then a "TO:" party block) - deliberately built with always-light classes,
// not theme-aware, since a paper document has no dark mode. See
// document-letterhead.tsx for the simpler version still used by receipts/
// payments, which don't have a line-item GST structure to mirror.
export function TaxInvoiceHeader({
  company,
  docLabel,
  docNumber,
  docDate,
  party,
  staffName,
  remarks,
}: {
  company: Company | null;
  docLabel: string;
  docNumber: string;
  docDate: string;
  party: Party;
  staffName?: string | null;
  remarks?: string | null;
}) {
  if (!company) return null;
  const companyStateCode = gstStateCode(company.state);
  const partyStateCode = gstStateCode(party.state);

  return (
    <div className="rounded-lg border border-gray-300 bg-white p-4 text-gray-900">
      <div className="flex items-start justify-between text-xs">
        <span>GSTIN : {company.gstin ?? "-"}</span>
        <span className="text-right">
          State : {company.state ?? "-"}
          <br />
          State Code : {companyStateCode ?? "-"}
        </span>
      </div>

      <div className="mt-1 text-center">
        {company.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={company.logo_url} alt="" className="mx-auto h-10 object-contain" />
        )}
        <p className="text-xl font-bold uppercase tracking-wide">{company.name}</p>
        {company.address && <p className="text-xs">{company.address}</p>}
        {company.phone && <p className="text-xs">Phone : {company.phone}</p>}
      </div>

      <div className="mt-2 flex justify-center">
        <div className="rounded border border-gray-400 px-4 py-1 text-sm font-semibold uppercase">{docLabel}</div>
      </div>

      <div className="mt-3 flex items-center justify-between border-b border-gray-200 pb-2 text-xs">
        <span>No. {docNumber}</span>
        <span>Date : {docDate}</span>
      </div>

      <div className="mt-2 flex items-start justify-between gap-4 text-xs">
        <div>
          <p className="font-semibold">TO : {party.name}</p>
          {party.address && <p>{party.address}</p>}
          {party.phone && <p>Mob : {party.phone}</p>}
          <p>State : {party.state ?? "-"}</p>
          <p>State Code : {partyStateCode ?? "-"}</p>
          <p>GSTIN : {party.gstin ?? "-"}</p>
        </div>
        {staffName && <p className="shrink-0 text-right">Sales Man : {staffName}</p>}
      </div>

      {remarks && <p className="mt-2 border-t border-gray-200 pt-2 text-xs">Remarks : {remarks}</p>}
    </div>
  );
}
