type Company = {
  name: string;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  invoice_terms: string | null;
};

export function TaxInvoiceFooter({
  company,
  amountWords,
  gstBreakdown,
  totalAmount,
}: {
  company: Company | null;
  amountWords: string;
  gstBreakdown: { rate: number; taxable: number; tax: number }[];
  totalAmount: number;
}) {
  if (!company) return null;
  const hasBankDetails = company.bank_name || company.bank_account_number || company.bank_ifsc;

  return (
    <div className="mt-4 rounded-lg border border-gray-300 bg-white p-4 text-xs text-gray-900">
      <p>{amountWords}</p>

      <div className="mt-3 flex items-start justify-between gap-4 border-t border-gray-200 pt-3">
        <div>
          {gstBreakdown.map((g) => (
            <p key={g.rate}>
              Sales {g.rate}% - {g.taxable.toFixed(2)} / {g.tax.toFixed(2)}
            </p>
          ))}
        </div>
        <p className="font-semibold">Bill Amount {totalAmount.toFixed(2)}</p>
      </div>

      <div className="mt-4 flex items-end justify-between gap-4 border-t border-gray-200 pt-3">
        <div>
          {hasBankDetails && (
            <>
              <p className="font-medium">Our Bank Details</p>
              {company.bank_name && <p>Bank : {company.bank_name}</p>}
              {company.bank_account_number && <p>A/C No : {company.bank_account_number}</p>}
              {company.bank_ifsc && <p>IFSC : {company.bank_ifsc}</p>}
            </>
          )}
        </div>
        <div className="text-right">
          <p>For {company.name}</p>
          <p className="mt-8">Authorised Signatory</p>
        </div>
      </div>

      {company.invoice_terms && (
        <div className="mt-3 border-t border-gray-200 pt-2">
          <p className="font-medium">Terms &amp; Conditions</p>
          <p>{company.invoice_terms}</p>
        </div>
      )}

      <p className="mt-2 text-[10px] text-gray-500">E.&amp;O.E.</p>
    </div>
  );
}
