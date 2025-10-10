interface CardProps {
  title?: string | React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export default function Card({ title, children, className = "" }: CardProps) {
  return (
    <div className={`card p-6 ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-brand dark:text-primary-300 mb-6 border-b border-slate-200 dark:border-slate-600 pb-3">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
