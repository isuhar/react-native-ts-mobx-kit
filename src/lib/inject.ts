import * as React from "react"
import PropTypes from "prop-types"

export interface StoreClass {
    new(...args: any[]): any
}

type StoreInstance = any

export class StoresMap {
    private map: Map<StoreClass, StoreInstance>
    constructor(iterable: Iterable<[StoreClass, StoreInstance]>) {
        this.map = new Map(iterable)
        this.map.set(StoresMap, this)
    }

    has(storeClass: StoreClass) {
        return this.map.has(storeClass)
    }

    get(storeClass: StoreClass): StoreInstance {
        if (!this.map.has(storeClass)) {
            const storeInstance = createStoreWithResolvedDependencies(storeClass, this)
            this.map.set(storeClass, storeInstance)
        }
        return this.map.get(storeClass)
    }
}

const nativeExp = /\{\s*\[native code\]\s*\}/
const injectParamStoreSymbol = Symbol()

type InjectParameters = number[]

/**
 *  Позволяет внедрить стор в объект
 *  Примеры:
 *     // Внедрение в React.Component
 *     import {inject} from "src/lib/utils/inject"
 *     import {Component} from "src/lib/components"
 *     import MyStore from "path/to/MyStore"
 *     class MyComponent extends Component<any, any> {
 *
 *        @inject
 *        private store: MyStore
 *
 *        private function myMethod() {
 *            this.store.storeMethod()
 *        }
 *     }
 *
 *     // Внедрение стора в стор
 *     import {inject} from "src/lib/utils/inject"
 *     import OtherStore from "path/to/OtherStore"
 *
 *     class MyStore {
 *
 *        private otherStore: OtherStore
 *
 *        constructor(@inject otherStore: OtherStore) {
 *            this.otherStore = otherStore
 *        }
 *     }
 *
 */
export function inject(target: any, propertyName: string, propertyIndex?: number): any {
    if (propertyName && propertyIndex === void 0) {
        return propertyDecorator(target, propertyName)
    } else if (!propertyName && propertyIndex !== void 0) {
        return parameterDecorator(target, propertyIndex)
    }
    throwError("Decorator is to be applied to property, or to a constructor parameter", target)
}

/**
 *  Создание инстанса стора с разрешением его зависимостей
 */
export function createStoreWithResolvedDependencies(store: StoreClass, storesMap: StoresMap) {
    const resolvedDependencies = resolveDependencies(store, storesMap).map((dependency) => storesMap.get(dependency))
    return new store(...resolvedDependencies)
}

/**
 * Определяет getter для свойства в target, который возвращает определенный Store
 */
function propertyDecorator(target: any, propertyName: string) {
    if (!(target instanceof React.Component)) {
        throwError("Injection store can implement only in React.Component", target)
    }
    const targetConstructor = target.constructor
    const storeConstructor = Reflect.getMetadata("design:type", target, propertyName)

    checkValidDependency(target, storeConstructor)

    if (targetConstructor.contextTypes == null) {
        targetConstructor.contextTypes = {}
    }

    if (targetConstructor.contextTypes.appStores == null) {
        targetConstructor.contextTypes.appStores = PropTypes.instanceOf(StoresMap).isRequired
    }

    const originalWillMount = targetConstructor.prototype.componentWillMount

    targetConstructor.prototype.componentWillMount = function () {
        this.context.appStores.get(storeConstructor)
        if (originalWillMount) {
            originalWillMount.call(this)
        }
    }

    Object.defineProperty(target, propertyName, {
        get: function() {
            return this.context.appStores.get(storeConstructor)
        }
    })
}

/**
 * Добавляет в метаданные прототипа объекта, информацию о том, что к какому-то параметру конструктора была внедрена зависимость
 */
function parameterDecorator(target: any, parameterIndex: number) {
    const injectParameters: InjectParameters = Reflect.getMetadata(injectParamStoreSymbol, target) || []
    const parametersTypes = Reflect.getMetadata("design:paramtypes", target)
    checkValidDependency(target, parametersTypes[parameterIndex])
    injectParameters.push(parameterIndex)
    Reflect.defineMetadata(injectParamStoreSymbol, injectParameters, target)
}

/**
 *  Определение наличия циклической зависимости и если она обнаружена, то функция выбрасывает исключение
 */
function detectCircularDependencies(dependencies: Set<StoreClass>, store: StoreClass) {
    if (dependencies.has(store)) {
        const chains = Array.from(dependencies.values()).map(dependency => dependency.name).join(" -> ")
        throwError(`Cyclic dependencies are found in the following chain "${chains}"`)
    }
}

/**
 *  Разрешение зависимостей
 */
function resolveDependencies(store: StoreClass, storesMap: StoresMap, dependenciesChain = new Set<StoreClass>()) {
    const injectParameters: InjectParameters = Reflect.getMetadata(injectParamStoreSymbol, store) || []
    const constructorParameters: any[] = Reflect.getMetadata("design:paramtypes", store)

    if (injectParameters.length === 0) {
        return []
    }

    const resolvedDependencies: StoreClass[] = []

    dependenciesChain.add(store)

    injectParameters.sort().forEach((parameter) => {
        const constructorParameter = constructorParameters[parameter]
        // Если стора нет в хранилище, надо проверить его зависимости на цикличность
        if (!storesMap.has(constructorParameter)) {
            detectCircularDependencies(dependenciesChain, constructorParameter)
            resolveDependencies(constructorParameter, storesMap, dependenciesChain)
        }
        resolvedDependencies.push(constructorParameter)
    })

    dependenciesChain.delete(store)

    return resolvedDependencies
}

/**
 * Выброс стилизованного исключения
 */
function throwError(message: string, target?: any) {
    throw new Error(`${message}.${target ? ` Error occurred in ${target.name}` : ""}`)
}

/**
 *  Является ли функция нативной реализацией
 */
function isNative(fn: Function) {
    return nativeExp.test("" + fn)
}

/**
 *  Проверка на валидность зависимости
 */
function checkValidDependency(target: any, dependency: Function) {
    if (!dependency || !("constructor" in dependency)) {
        throwError("Dependency must have a constructor", target)
    }
    if (isNative(dependency)) {
        throwError("Dependency may not be native implementation", target)
    }
}
