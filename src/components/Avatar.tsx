import type { Chat, Contact } from '../types';

export function Avatar({
  contact,
  size,
  className = '',
}: {
  contact?: Contact;
  size?: number;
  className?: string;
}) {
  if (!contact) {
    return <div className={`avatar ${className}`} style={{ background: '#8e8e93' }} />;
  }
  const style: React.CSSProperties = {
    background: `linear-gradient(160deg, ${contact.color[0]}, ${contact.color[1]})`,
  };
  if (size) {
    style.width = size;
    style.height = size;
    style.fontSize = Math.round(size * 0.36);
  }
  return (
    <div className={`avatar ${className}`} style={style} title={contact.name}>
      {contact.avatar ? <img src={contact.avatar} alt="" /> : contact.initials}
    </div>
  );
}

/** group chats get the layered Apple-style cluster */
export function ChatAvatar({
  contacts,
  size = 44,
}: {
  chat?: Chat;
  contacts: Contact[];
  size?: number;
}) {
  if (contacts.length <= 1) return <Avatar contact={contacts[0]} size={size} />;
  const shown = contacts.slice(0, 3);
  return (
    <div className="avatar-stack" style={{ width: size, height: size, fontSize: size }}>
      {shown.map((c, i) => (
        <Avatar key={c.id} contact={c} className={`a${i}`} />
      ))}
    </div>
  );
}
