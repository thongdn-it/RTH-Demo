const ACCOUNTS = [
  { role: "Giáo viên", email: "teacher.lan@rth.demo", note: "Lớp 6A1" },
  { role: "Giáo viên", email: "teacher.minh@rth.demo", note: "Lớp 6A2" },
  { role: "Học sinh", email: "student.an@rth.demo", note: "Lớp 6A1" },
  { role: "Học sinh", email: "student.dung@rth.demo", note: "Lớp 6A2" },
  { role: "Phụ huynh", email: "parent.hoa@rth.demo", note: "Mẹ của An và Chi" },
  { role: "Phụ huynh", email: "parent.mai@rth.demo", note: "Mẹ của Dũng" },
];

/**
 * Seeded accounts, shown because this is a demo build. A real deployment would
 * not print credentials on the login screen.
 */
export function DemoAccounts() {
  return (
    <div className="mt-6 rounded-lg border border-border p-4">
      <p className="text-sm font-medium">Tài khoản demo</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Mật khẩu chung: <code className="font-mono">Demo@1234</code>
      </p>

      <ul className="mt-3 space-y-2">
        {ACCOUNTS.map((account) => (
          <li key={account.email} className="text-sm">
            <span className="text-muted-foreground">{account.role}:</span>{" "}
            <span className="break-all font-mono text-xs">{account.email}</span>
            <span className="block text-xs text-muted-foreground">{account.note}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
