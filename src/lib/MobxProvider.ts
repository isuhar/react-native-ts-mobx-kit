import React from "react"
import PropTypes from "prop-types"

export class NativeStoresProvider extends React.Component<{store: {}}, {}> {

    public static childContextTypes = {
        mobxStores: PropTypes.object
    }

    getChildContext() {
        return {
            mobxStores: this.props.store,
        }
    }

    render() {
        return React.Children.only(this.props.children)
    }
}
