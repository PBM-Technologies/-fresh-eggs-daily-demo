import { Empty, Page } from '../components/ui';
import { Link } from '../router';

export default function NotFound() {
  return (
    <Page title="Page not found">
      <div className="card"><Empty icon="🥚" title="This nest is empty" action={<Link className="btn primary" to="/">Go home</Link>}>We could not find that page.</Empty></div>
    </Page>
  );
}
