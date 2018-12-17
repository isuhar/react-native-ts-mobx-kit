import {Navigation} from "react-native-navigation"
import {Constants} from "src/lib/constants"
import {MainScreen} from "src/screens/MainScreen"
import {NativeStoresProvider} from "src/lib/MobxProvider"

export function registerScreens(store: {}) {
    Navigation.registerComponentWithRedux(Constants.screens.main,() => MainScreen, NativeStoresProvider, store);
}
