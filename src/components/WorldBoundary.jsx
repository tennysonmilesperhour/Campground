import { Component } from "react";
export default class WorldBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <div className="world-placeholder">
          <p>
            The world could not load. You can still explore every traveler using
            the list.
          </p>
          <button
            className="button"
            onClick={() => this.setState({ failed: false })}
          >
            Try loading the world
          </button>
        </div>
      );
    return this.props.children;
  }
}
