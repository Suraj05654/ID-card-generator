const AppFooter = () => {
  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 py-6 text-center text-muted-foreground">
        <p className="text-sm">
          &copy; {new Date().getFullYear()} ECR ID Connect. All rights reserved.
        </p>
        <p className="text-xs mt-1">
          Designed for East Coast Railway employees.
        </p>
      </div>
    </footer>
  );
};

export default AppFooter;
