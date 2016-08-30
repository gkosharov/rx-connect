import React  from "react";
import Rx from "rx";
import isPlainObject from 'lodash.isplainobject';

function getDisplayName(WrappedComponent) {
    return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

export default function rxConnect(selectState) {
    return WrappedComponent => class RxConnector extends React.PureComponent {

        static displayName = 'RxConnector';

        static contextTypes = {
            store: React.PropTypes.object
        };

        stateSubscription = undefined;

        store = undefined;

        state$ = undefined;

        state = {
            props: {}
        };

        shouldDebounce = false;

        constructor(props, context) {
            super(props, context);

            this.props$ = new Rx.BehaviorSubject(props);

            this.store = props.store || context.store;

            if (this.store) {
                this.state$ = Rx.Observable
                    .create(observer => this.store.subscribe(() => observer.onNext(this.store.getState())))
                    .startWith(this.store.getState())
                    .distinctUntilChanged();
            }
        }

        componentWillMount() {
            this.shouldDebounce = false;

            this.stateSubscription = selectState(this.props$, this.state$, this.store && this.store.dispatch)
                .debounce(() => this.shouldDebounce ? Rx.Observable.interval(1) : Rx.Observable.of())
                .subscribe(props => {
                    if (!isPlainObject(props)) {
                        // eslint-disable-next-line no-console
                        console.error(`RxConnect stream *must* return plain object of properties. Check rxConnect of ${getDisplayName(WrappedComponent)}. Got: `, props);
                        return;
                    }

                    this.setState({ props });
                });
        }

        componentDidMount() {
            this.shouldDebounce = true;
        }

        componentWillUnmount() {
            this.stateSubscription.dispose();
        }

        componentWillReceiveProps(nextProps) {
            this.props$.onNext(nextProps);
        }

        render() {
            return React.createElement(WrappedComponent, {
                ...this.props,
                ...this.state.props
            });
        }
    };
}
