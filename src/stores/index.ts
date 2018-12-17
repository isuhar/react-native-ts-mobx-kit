import {AsyncStorage} from "react-native"
import {create} from "mobx-persist"
import {MainStore} from "src/stores/MainStore"

const hydrate = create({
    storage: AsyncStorage,
})

export async function initialStores() {
    const mainStore = await hydrate("mainStore", new MainStore())

    return {
        mainStore: mainStore,
    }
}
