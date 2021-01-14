import { useEffect, useRef } from 'react';
import * as amplitude from 'amplitude-js';
import { AmplitudeClient } from 'amplitude-js';
import constate from 'constate';

export enum AmplitudeEvents {
    'sidevisning' = 'sidevisning',
    'applikasjonStartet' = 'applikasjon-startet',
    'søknadSendt' = 'skjema fullført',
    'søknadFeilet' = 'skjemainnsending feilet',
    'applikasjonInfo' = 'applikasjon-info',
    'applikasjonHendelse' = 'applikasjon-hendelse',
}

export enum ApplikasjonHendelse {
    'brukerSendesTilLoggInn' = 'brukerSendesTilLoggInn',
    'vedleggOpplastingFeilet' = 'vedleggOpplastingFeilet',
    'starterMedMellomlagring' = 'starterMedMellomlagring',
    'avbryt' = 'avbryt',
    'fortsettSenere' = 'fortsettSenere',
}

interface Props {
    applicationKey: string;
    team: string;
    logToConsoleOnly?: boolean;
    isActive?: boolean;
    children: React.ReactNode;
}

export const [AmplitudeProvider, useAmplitudeInstance] = constate((props: Props) => {
    const { applicationKey, isActive, logToConsoleOnly, team } = props;
    const instance = useRef<AmplitudeClient | undefined>();

    useEffect(() => {
        if (amplitude && isActive) {
            instance.current = amplitude.getInstance();
            if (instance.current) {
                instance.current.init('default', '', {
                    apiEndpoint: 'amplitude.nav.no/collect-auto',
                    saveEvents: false,
                    includeUtm: true,
                    includeReferrer: true,
                    platform: window.location.toString(),
                });
            }
        }
    }, [isActive]);

    async function logEvent(eventName: string, eventProperties?: any) {
        if (isActive && instance.current) {
            const eventProps = { ...eventProperties, app: applicationKey, applikasjon: applicationKey };
            if (logToConsoleOnly) {
                console.log({ eventName, eventProperties: eventProps });
                return Promise.resolve();
            }
            if (instance.current) {
                return instance.current.logEvent(eventName, eventProps);
            }
        }
    }

    function setUserProperties(properties: any) {
        if (isActive && instance.current) {
            instance.current.setUserProperties(properties);
        }
    }

    async function logSidevisning(pageKey: string) {
        return logEvent(AmplitudeEvents.sidevisning, {
            pageKey,
            team,
        });
    }

    async function logSoknadSent(skjemanavn: string) {
        return logEvent(AmplitudeEvents.søknadSendt, {
            skjemanavn,
            skjemaId: applicationKey,
        });
    }

    async function logSoknadFailed(skjemanavn: string) {
        return logEvent(AmplitudeEvents.søknadFeilet, {
            skjemanavn,
            skjemaId: applicationKey,
        });
    }

    async function logHendelse(hendelse: ApplikasjonHendelse, details?: any) {
        return logEvent(AmplitudeEvents.applikasjonHendelse, {
            hendelse,
            details,
        });
    }

    return { logEvent, logSidevisning, setUserProperties, logSoknadSent, logSoknadFailed, logHendelse };
});
