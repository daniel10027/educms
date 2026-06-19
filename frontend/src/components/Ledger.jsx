import './Ledger.css';

export function Ledger({ children }) {
  return <div className="ledger">{children}</div>;
}

export function LedgerRow({ index, children, className = '' }) {
  return (
    <div className={`ledger-row ${className}`}>
      <span className="ledger-index" aria-hidden="true">
        {String(index).padStart(2, '0')}
      </span>
      <div className="ledger-row-body">{children}</div>
    </div>
  );
}
