import { useEffect, useRef } from 'react';
import { AmplitudeClient, getInstance } from 'amplitude-js';
import constate from 'constate';

const MAX_AWAIT_TIME = 500;

export enum SIFCommonPageKey {
    'velkommen' = 'velkommen',
    'kvittering' = 'kvittering',
    'feilside' = 'feilside',
    'intro' = 'intro',
    /** deprecated - erstattet av ikkeTilgang */
    'ikkeMyndig' = 'ikkeMyndig',
    'ikkeTilgang' = 'ikkeTilgang',
    'ikkeTilgjengelig' = 'ikkeTilgjengelig',
}

export enum AmplitudeEvents {
    'sidevisning' = 'sidevisning',
    'applikasjonStartet' = 'applikasjon-startet',
    'søknadStartet' = 'skjema startet',
    'søknadSendt' = 'skjema fullført',
    'søknadFeilet' = 'skjemainnsending feilet',
    'applikasjonInfo' = 'applikasjon-info',
    'applikasjonHendelse' = 'applikasjon-hendelse',
    'apiError' = 'api-error',
}

export enum ApplikasjonHendelse {
    'brukerSendesTilLoggInn' = 'brukerSendesTilLoggInn',
    'vedleggOpplastingFeilet' = 'vedleggOpplastingFeilet',
    'starterMedMellomlagring' = 'starterMedMellomlagring',
    'avbryt' = 'avbryt',
    'fortsettSenere' = 'fortsettSenere',
}

export enum ApiError {
    'oppstartsinfo' = 'oppstartsinfo',
    'søkerinfo' = 'søkerinfo',
    'arbeidsgiver' = 'arbeidsgiver',
    'barn' = 'barn',
    'vedlegg' = 'vedlegg',
}

interface Props {
    applicationKey: string;
    logToConsoleOnly?: boolean;
    isActive?: boolean;
    children: React.ReactNode;
    maxAwaitTime?: number;
}

type EventProperties = {
    [key: string]: any;
};

export const [AmplitudeProvider, useAmplitudeInstance] = constate((props: Props) => {
    const { applicationKey, isActive = true, maxAwaitTime = MAX_AWAIT_TIME, logToConsoleOnly } = props;
    const instance = useRef<AmplitudeClient | undefined>();

    useEffect(() => {
        if (isActive) {
            instance.current = getInstance();
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

    async function logEvent(eventName: string, eventProperties?: EventProperties) {
        if (isActive && instance.current) {
            const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), maxAwaitTime));
            const logPromise = new Promise((resolve, reject) => {
                const eventProps = { ...eventProperties, app: applicationKey, applikasjon: applicationKey };
                if (logToConsoleOnly) {
                    console.log({ eventName, eventProperties: eventProps });
                    resolve(true);
                }
                if (instance.current) {
                    instance.current.logEvent(eventName, eventProps, (response: any) => {
                        resolve(response);
                    });
                } else {
                    reject('no instance');
                }
            });
            return Promise.race([timeoutPromise, logPromise]);
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
        });
    }

    async function logSoknadStartet(skjemanavn: string) {
        return logEvent(AmplitudeEvents.søknadStartet, {
            skjemanavn,
            skjemaId: applicationKey,
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

    async function logHendelse(hendelse: ApplikasjonHendelse, details?: EventProperties) {
        return logEvent(AmplitudeEvents.applikasjonHendelse, {
            hendelse,
            details,
        });
    }

    async function logApiError(error: ApiError, details?: EventProperties) {
        return logEvent(AmplitudeEvents.apiError, {
            error,
            details,
        });
    }

    async function logInfo(details: EventProperties) {
        return logEvent(AmplitudeEvents.applikasjonInfo, details);
    }

    async function logUserLoggedOut(info: string) {
        return logEvent(AmplitudeEvents.applikasjonHendelse, {
            hendelse: ApplikasjonHendelse.brukerSendesTilLoggInn,
            info,
        });
    }

    return {
        logEvent,
        logSidevisning,
        setUserProperties,
        logSoknadStartet,
        logSoknadSent,
        logSoknadFailed,
        logHendelse,
        logInfo,
        logApiError,
        logUserLoggedOut,
    };
});
