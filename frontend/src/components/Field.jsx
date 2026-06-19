import './Field.css';

export function Field({ label, hint, error, required, children, htmlFor }) {
  return (
    <div className="field">
      {label && (
        <label htmlFor={htmlFor} className="field-label">
          {label}
          {required && <span className="field-required">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="field-hint">{hint}</p>}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function Input(props) {
  return <input className="field-input" {...props} />;
}

export function Textarea(props) {
  return <textarea className="field-input field-textarea" {...props} />;
}

export function Select({ children, ...props }) {
  return (
    <select className="field-input field-select" {...props}>
      {children}
    </select>
  );
}
