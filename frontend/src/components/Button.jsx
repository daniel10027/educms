import './Button.css';

export default function Button({
  variant = 'primary',
  size = 'md',
  as: Component = 'button',
  children,
  className = '',
  ...props
}) {
  return (
    <Component className={`btn btn-${variant} btn-${size} ${className}`} {...props}>
      {children}
    </Component>
  );
}
