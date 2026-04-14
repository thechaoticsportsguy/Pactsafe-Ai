import TopNav from "@/components/TopNav";
import Footer from "@/components/Footer";

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav variant="app" />
      <main
        id="main-content"
        className="container-app flex-1 py-10 md:py-14"
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}
