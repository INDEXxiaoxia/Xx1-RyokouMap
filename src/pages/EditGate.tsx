import { useState } from 'react';
import EditPage from './EditPage';

const EDIT_AUTH_KEY = 'ryokou-edit-auth-v1';
const EDIT_PASSWORD = '咕咕嘎嘎';

export function EditGate() {
  const [unlocked, setUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem(EDIT_AUTH_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [password, setPassword] = useState('');

  if (unlocked) {
    return <EditPage />;
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === EDIT_PASSWORD) {
      try {
        sessionStorage.setItem(EDIT_AUTH_KEY, '1');
      } catch {
        /* ignore */
      }
      setUnlocked(true);
      setPassword('');
    } else {
      setPassword('');
    }
  };

  return (
    <div className="edit-gate">
      <form className="edit-gate-form" onSubmit={onSubmit}>
        <input
          type="text"
          className="edit-gate-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="off"
          autoFocus
          aria-label="密码"
        />
      </form>
    </div>
  );
}
