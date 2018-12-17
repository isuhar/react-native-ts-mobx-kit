import {observable} from "mobx"
import {persist} from "mobx-persist"


export class MainStore {

    @persist
    @observable
    public title = "ISUHAR"

}
