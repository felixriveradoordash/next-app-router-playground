import { INITIAL_PORTFOLIO_STATE } from '#/lib/value-calculator/model';
import { ValueOsApp } from '#/ui/value-os-app';

export default function Page() {
  return <ValueOsApp initialState={INITIAL_PORTFOLIO_STATE} />;
}
