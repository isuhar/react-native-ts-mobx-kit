import "reflect-metadata"

import {registerScreens} from "src/screens"
import {initialStores} from "src/stores"
import {Navigation} from "react-native-navigation"
import {Constants} from "src/lib/constants"

export async function App() {
    const stores = await initialStores()
    registerScreens(stores)

    Navigation.events().registerAppLaunchedListener(() => {
        void Navigation.setRoot({
            root: {
                component: {
                    name: Constants.screens.main,
                }
            }
        })
    })
}
