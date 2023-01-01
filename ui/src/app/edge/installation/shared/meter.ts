export enum Meter {
    SOCOMEC,
    KDK
}

export namespace Meter {

    /**
     * The meter type for the home app.
     * 
     * Can be different on edge side.
     * 
     * @param meter the meter
     * @returns the type for the home app
     */
    export function toAppAcMeterType(meter: Meter): string {
        switch (meter) {
            case Meter.SOCOMEC:
                return 'SOCOMEC';
            case Meter.KDK:
                return 'KDK';
        }
    }

    /**
     * The app id of the meter in the edge.
     * 
     * @param meter the meter 
     * @returns the app id
     */
    export function toAppId(meter: Meter): string {
        switch (meter) {
            case Meter.SOCOMEC:
                return 'App.Meter.Socomec';
            case Meter.KDK:
                return 'App.Meter.Kdk';
        }
    }

    /**
     * Returns the factory id of the meter type selected.
     * 
     * @param meter The Meter.
     * @returns the factory id of the meter.
     */
    export function toFactoryId(meter: Meter): string {
        switch (meter) {
            case Meter.SOCOMEC:
                return 'Meter.Socomec.Threephase';
            case Meter.KDK:
                return 'Meter.KDK.2PUCT';
        }
    }

    /**
     * Returns the label of the meter selected as string.
     * 
     * @param meter The meter type.
     * @returns the meter label as string.
     */
    export function toLabelString(meter: Meter): string {
        switch (meter) {
            case Meter.SOCOMEC:
                return 'Socomec';
            case Meter.KDK:
                return 'KDK';
        }
    }

    /**
     * Returns the parity of the meter selected as string.
     * 
     * @param meter The meter type.
     * @returns the meter label as string.
     */
    export function toParityString(meter: Meter): string {
        switch (meter) {
            case Meter.SOCOMEC:
                return 'NONE';
            case Meter.KDK:
                return 'EVEN';
        }
    }
}