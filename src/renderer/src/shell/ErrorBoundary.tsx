import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
          <h2 style={{ color: '#ea4335', fontSize: '1rem', marginBottom: '1rem' }}>应用出错了</h2>
          <pre style={{
            background: '#f5f5f5', padding: '1rem', borderRadius: '0.5rem',
            fontSize: '0.75rem', overflow: 'auto', maxHeight: '400px', whiteSpace: 'pre-wrap',
          }}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload() }}
            style={{
              marginTop: '1rem', padding: '0.5rem 1rem', background: '#E4002B', color: '#fff',
              border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem',
            }}
          >
            重新加载
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
