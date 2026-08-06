import { useRouter } from '../state/RouterContext.jsx';

// An internal link that is a real <a href>.
//
// The app navigated entirely through <button onClick={navigate(...)}>. That
// works for people but is invisible to search engines: crawlers follow
// `href` attributes, and a button has none. So on Google's rendered pass the
// blog index appeared to link to nothing, and none of the site's internal link
// equity flowed to the article pages it was supposed to be promoting.
//
// This keeps client-side routing (no full reload) while emitting markup a
// crawler can actually traverse. It also fixes a real usability gap for free:
// cmd/ctrl-click and middle-click now open in a new tab, and the browser shows
// the destination on hover, neither of which a button can do.
export default function RouteLink({ to, children, className = '', ...rest }) {
  const { navigate } = useRouter();

  function handleClick(event) {
    // Let the browser handle modified clicks natively so "open in new tab"
    // keeps working — intercepting these is the classic SPA-link mistake.
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (event.button !== 0) return;
    event.preventDefault();
    navigate(to);
  }

  return (
    <a href={to} className={className} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
