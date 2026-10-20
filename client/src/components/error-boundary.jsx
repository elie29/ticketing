import { Component } from 'react';
import { PageProblem } from './ui';

// Keeps a page that fails to render from blanking the whole app.
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <PageProblem error={{ status: 500 }} /> : this.props.children;
  }
}
