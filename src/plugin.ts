import { PluginDef, PluginManager } from '@senx/discovery-widgets';
import * as pack from '../package.json';

export default () => {
    PluginManager.getInstance().register(
        new PluginDef({
        type: 'kwh50-line',
        name: pack.name,
        tag: 'kwh50-line',
        author: pack.author,
        description: pack.description,
        version: pack.version,
        }),
    );
};
