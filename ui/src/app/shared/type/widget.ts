import { Edge } from '../edge/edge';
import { EdgeConfig } from '../edge/edgeconfig';
import { Utils } from '../shared';

export enum WidgetClass {
    'Energymonitor',
    'Common_Autarchy',
    'Common_Selfconsumption',
    'Storage',
    'Grid',
    'Common_Production',
    'Consumption',
}

export enum WidgetNature {
    'io.openems.edge.evcs.api.Evcs',
    'io.openems.impl.controller.channelthreshold.ChannelThresholdController', // TODO deprecated
    'io.openems.edge.io.api.DigitalInput',
}

export enum WidgetFactory {
    'Controller.Asymmetric.PeakShaving',
    'Controller.ChannelThreshold',
    'Controller.CHP.SoC',
    'Controller.Ess.DelayedSellToGrid',
    'Controller.Ess.FixActivePower',
    'Controller.Ess.GridOptimizedCharge',
    'Controller.Ess.Time-Of-Use-Tariff.Discharge',
    'Controller.Ess.Time-Of-Use-Tariff',
    'Controller.IO.ChannelSingleThreshold',
    'Controller.Io.FixDigitalOutput',
    'Controller.IO.HeatingElement',
    'Controller.Io.HeatPump.SgReady',
    'Controller.Symmetric.PeakShaving',
    'Controller.TimeslotPeakshaving',
    'Evcs.Cluster.PeakShaving',
    'Evcs.Cluster.SelfConsumption',
}

export type Icon = {
    color: string;
    size: string;
    name: string;
}

export class Widget {
    public name: WidgetNature | WidgetFactory | String;
    public componentId: string;
}

export type AdvertWidget = {
    name: string;
    title?: string;
}

export class AdvertWidgets {

    public static parseAdvertWidgets(edge: Edge, config: EdgeConfig) {

        let list: AdvertWidget[] = [];

        //Temporarily removing from displaying this advertise.
        /*
        if (edge.producttype == ProductType.HOME) {
            list.push({
                name: 'FeneconHomeExtension',
                title: 'FENECON Home Erweiterung'
            })
        }

        list.push({
            name: 'Alerting',
            title: 'Neue Benachrichtigungsfunktion jetzt verfügbar!'
        })
        */

        list = Utils.shuffleArray(list);
        return new AdvertWidgets(list);
    }

    private constructor(
        /**
         * List of all Widgets.
         */
        public readonly list: AdvertWidget[],
    ) { }
}

export class Widgets {

    public static parseWidgets(edge: Edge, config: EdgeConfig): Widgets {

        let classes: String[] = Object.values(WidgetClass) //
            .filter(v => typeof v === 'string')
            .filter(clazz => {
                if (!edge.isVersionAtLeast('2018.8')) {

                    // no filter for deprecated versions
                    return true;
                }
                switch (clazz) {
                    case 'Common_Autarchy':
                    case 'Grid':
                        return config.hasMeter();
                    case 'Energymonitor':
                    case 'Consumption':
                        if (config.hasMeter() == true || config.hasProducer() == true || config.hasStorage() == true) {
                            return true;
                        } else {
                            return false;
                        }
                    case 'Storage':
                        return config.hasStorage();
                    case 'Common_Production':
                    case 'Common_Selfconsumption':
                        return config.hasProducer();
                };
                return false;
            }).map(clazz => clazz.toString());
        let list: Widget[] = [];

        for (let nature of Object.values(WidgetNature).filter(v => typeof v === 'string')) {
            for (let componentId of config.getComponentIdsImplementingNature(nature.toString())) {
                if (nature === 'io.openems.edge.io.api.DigitalInput' && list.some(e => e.name === 'io.openems.edge.io.api.DigitalInput')) {
                    continue;
                }
                if (config.getComponent(componentId).isEnabled) {
                    list.push({ name: nature, componentId: componentId });
                }
            }
        }
        for (let factory of Object.values(WidgetFactory).filter(v => typeof v === 'string')) {
            for (let componentId of config.getComponentIdsByFactory(factory.toString())) {
                if (config.getComponent(componentId).isEnabled) {
                    list.push({ name: factory, componentId: componentId });
                }
            }
        }

        // explicitely sort ChannelThresholdControllers by their outputChannelAddress
        list.sort((w1, w2) => {
            if (w1.name === 'Controller.IO.ChannelSingleThreshold' && w2.name === 'Controller.IO.ChannelSingleThreshold') {
                let outputChannelAddress1: string | string[] = config.getComponentProperties(w1.componentId)['outputChannelAddress'];
                if (typeof outputChannelAddress1 !== 'string') {
                    // Takes only the first output for simplicity reasons
                    outputChannelAddress1 = outputChannelAddress1[0];
                }
                let outputChannelAddress2: string | string[] = config.getComponentProperties(w2.componentId)['outputChannelAddress'];
                if (typeof outputChannelAddress2 !== 'string') {
                    // Takes only the first output for simplicity reasons
                    outputChannelAddress2 = outputChannelAddress2[0];
                }
                if (outputChannelAddress1 && outputChannelAddress2) {
                    return outputChannelAddress1.localeCompare(outputChannelAddress2);
                }
            }

            return w1.componentId.localeCompare(w1.componentId);
        });
        return new Widgets(list, classes);
    }

    /**
     * Names of Widgets.
     */
    public readonly names: string[] = [];

    private constructor(
        /**
         * List of all Widgets.
         */
        public readonly list: Widget[],
        /**
         * List of Widget-Classes.
         */
        public readonly classes: String[],
    ) {
        // fill names
        for (let widget of list) {
            let name: string = widget.name.toString();
            if (!this.names.includes(name)) {
                this.names.push(name);
            }
        }
    }
}

export enum ProductType {
    HOME = "home"
}
