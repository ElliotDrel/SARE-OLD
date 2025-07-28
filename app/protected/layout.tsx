export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <div className="container-sare py-8">
          {children}
      </div>
    </div>
  );
}
