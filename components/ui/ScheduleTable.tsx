import { cn } from "./cn";

/**
 * A payment schedule as a small table: date, what it is, amount.
 *
 * Every screen that shows money over time (checkout, paying ahead, the
 * confirmation, the bookings card, the trip page) uses this, so a schedule
 * reads the same wherever a traveler meets it. A real <table> because it is
 * one: dates against amounts, read across and down, and announced as such.
 *
 * The status column only appears when some row carries a status. A row can be
 * `struck` (an installment an early payment covers), which strikes its amount
 * and quiets the row without hiding it, and `current` (what is charged today),
 * which sets it in full ink.
 */

export type ScheduleRow = {
  key: string;
  date: React.ReactNode;
  /** Under the date: "60 days before the trip", "Deposit". */
  note?: React.ReactNode;
  status?: React.ReactNode;
  amount: React.ReactNode;
  /** The amount this row was before, shown struck through beside it. */
  was?: React.ReactNode;
  struck?: boolean;
  current?: boolean;
};

export default function ScheduleTable({
  caption,
  hideCaption = false,
  rows,
  total,
  statusHeading = "Status",
  className,
}: {
  caption: string;
  hideCaption?: boolean;
  rows: ScheduleRow[];
  /** A closing row under a heavier rule: "Trip total", "$4,500". */
  total?: { label: React.ReactNode; amount: React.ReactNode };
  statusHeading?: string;
  className?: string;
}) {
  const withStatus = rows.some((row) => row.status !== undefined);
  const columns = withStatus ? 3 : 2;

  return (
    <table className={cn("w-full border-collapse text-left tabular-nums", className)}>
      <caption
        className={cn(
          "pb-3 text-left t-micro text-[--text-secondary]",
          hideCaption && "sr-only",
        )}
      >
        {caption}
      </caption>
      <thead>
        <tr className="border-b border-[--rule-strong]">
          <th scope="col" className="pb-2.5 pr-4 text-left t-micro font-normal text-[--text-secondary]">
            Date
          </th>
          {withStatus && (
            <th scope="col" className="pb-2.5 pr-4 text-left t-micro font-normal text-[--text-secondary]">
              {statusHeading}
            </th>
          )}
          <th scope="col" className="pb-2.5 text-right t-micro font-normal text-[--text-secondary]">
            Amount
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.key}
            // Without a total the last rule is left off, so the table does not
            // close on a hairline sitting just above whatever follows it.
            className={cn("border-b border-[--rule-faint] align-top", !total && "last:border-b-0")}
          >
            <td className="py-3.5 pr-4">
              <span
                className={cn(
                  "block font-body text-body-s",
                  row.current ? "font-medium text-[--text]" : "text-[--text]",
                  row.struck && "text-[--text-secondary]",
                )}
              >
                {row.date}
              </span>
              {row.note && (
                <span className="mt-0.5 block font-body text-body-s text-[--text-secondary]">
                  {row.note}
                </span>
              )}
            </td>
            {withStatus && (
              <td className="py-3.5 pr-4 font-body text-body-s text-[--text-secondary]">{row.status}</td>
            )}
            <td className="whitespace-nowrap py-3.5 text-right">
              {row.was && !row.struck && (
                <s className="mr-2 font-body text-body-s text-[--text-secondary]">
                  <span className="sr-only">was </span>
                  {row.was}
                </s>
              )}
              {row.struck ? (
                <s className="font-body text-body-s text-[--text-secondary]">{row.amount}</s>
              ) : (
                <span
                  className={cn(
                    "font-display font-medium tracking-title text-[--text]",
                    row.current ? "text-body" : "text-body-s",
                  )}
                >
                  {row.amount}
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
      {total && (
        <tfoot>
          <tr className="border-t border-[--rule-strong]">
            <th
              scope="row"
              colSpan={columns - 1}
              className="pt-3.5 pr-4 text-left font-body text-body-s font-normal text-[--text-secondary]"
            >
              {total.label}
            </th>
            <td className="whitespace-nowrap pt-3.5 text-right font-display text-body-s font-medium tracking-title text-[--text]">
              {total.amount}
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}
