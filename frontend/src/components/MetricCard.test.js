import React from 'react';
import { render, screen } from '@testing-library/react';
import MetricCard from '../components/MetricCard';

describe('MetricCard', () => {
  it('renders title and value', () => {
    render(<MetricCard title="Total Cost" value="$1,234" />);
    expect(screen.getByText('Total Cost')).toBeInTheDocument();
    expect(screen.getByText('$1,234')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<MetricCard title="Cost" value="$100" subtitle="Last 30 days" />);
    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
  });

  it('does not render subtitle when omitted', () => {
    const { queryByText } = render(<MetricCard title="Cost" value="$100" />);
    expect(queryByText('Last 30 days')).not.toBeInTheDocument();
  });

  it('renders trend value when provided', () => {
    render(<MetricCard title="CPU" value="67%" trendValue="+5%" trend="up" />);
    expect(screen.getByText('+5%')).toBeInTheDocument();
  });

  it('does not render trend section when trendValue is omitted', () => {
    const { queryByText } = render(<MetricCard title="CPU" value="67%" />);
    expect(queryByText('+5%')).not.toBeInTheDocument();
  });

  it('renders with custom color prop without crashing', () => {
    const { container } = render(
      <MetricCard title="Memory" value="72%" color="warning" />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders icon when provided', () => {
    render(
      <MetricCard
        title="Resources"
        value="42"
        icon={<span data-testid="test-icon">icon</span>}
      />,
    );
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('renders "down" trend without crashing', () => {
    const { container } = render(
      <MetricCard title="Cost" value="$500" trend="down" trendValue="-10%" />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('renders flat trend without crashing', () => {
    const { container } = render(
      <MetricCard title="Cost" value="$500" trend="flat" trendValue="0%" />,
    );
    expect(container.firstChild).toBeTruthy();
  });
});
