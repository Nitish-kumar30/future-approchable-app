export default function Footer() {
  return (
    <footer className="border-t border-border py-6 mt-auto">
      <div className="container flex items-center justify-center text-sm text-muted-foreground">
        <p>
          © {new Date().getFullYear()} Approachable.dev. All rights reserved. For support, contact: ranbeer@gmail.com
        </p>
      </div>
    </footer>
  );
}
