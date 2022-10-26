import axios from "axios";
import * as https from 'https';
import * as path from 'path';
import * as fs from "fs";

const servers = (process.env.P9_SERVER_URL && process.env.P9_SERVER_TOKEN)
    ? [{url: process.env.P9_SERVER_URL, token: process.env.P9_SERVER_TOKEN}]
    : JSON.parse(`[]`);

const agent = new https.Agent({
    rejectUnauthorized: false
});

const packageRelationEntityType: {
    name: string;
    entityType: string;
    sequence?: number;
    relations?: string[];
}[] = [
    { name: 'role', entityType: 'role' },
    { name: 'wf_notifications', entityType: 'wf_notifications' },
    { name: 'certificates', entityType: 'certificates' },
    { name: 'odataMock', entityType: 'odataMock' },
    { name: 'theme', entityType: 'theme' },
    { name: 'pdf', entityType: 'pdf' },
    { name: 'doc', entityType: 'doc' },
    { name: 'jsscript_group', entityType: 'jsscript_group' },
    { name: 'script_scheduler', entityType: 'script_scheduler' },
    { name: 'wf_definition', entityType: 'wf_definition' },
    { name: 'api_authentication', entityType: 'api_authentication' },
    { name: 'systems', entityType: 'systems' },

    { name: 'api_group', entityType: 'api_group' },
    { name: 'api', entityType: 'api', relations: ['roles'] },
    { name: 'jsclass', entityType: 'jsscript' },
    { name: 'odataSource', entityType: 'odataSource' },

    { name: 'rulesengine', entityType: 'rulesengine', relations: ['roles'] },
    { name: 'department', entityType: 'department', relations: ['roles'] },
    { name: 'tile', entityType: 'tile', relations: ['roles'] },
    {
        name: 'dictionary',
        entityType: 'dictionary',
        relations: ['rolesRead', 'rolesWrite'],
    },
    { name: 'apps', entityType: 'app_runtime', relations: ['apis'] },
    { name: 'category', entityType: 'category', relations: ['roles', 'tiles'] },
    { name: 'launchpad', entityType: 'launchpad', relations: ['cat'] },
    {
        name: 'reports',
        entityType: 'reports',
        relations: ['roles', 'scriptSelObj', 'scriptRunObj', 'tableObj'],
    },
];

const artifactsPath = path.join(process.cwd(), 'artifacts');

async function readFile(
    path: fs.PathLike,
    options?: { encoding?: BufferEncoding; flag?: string } | BufferEncoding,
): Promise<string | Buffer> {
    return new Promise((resolve, reject) => {
        fs.readFile(path, options, (err, data) => {
            err ? reject(err) : resolve(data);
        });
    });
}

async function readPackageFile() {
    const content = await readFile(path.join(artifactsPath, 'dev_package.json'), 'utf-8') as string;
    return JSON.parse(content);
}

async function deployPackageFile(devPackage, url, token) {
    try {
        await axios.post(`${url}/api/functions/Package/SaveDeployPackage`, devPackage, {
            httpsAgent: agent,
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        });
    } catch (e) {
        console.log(`Error sending development package to: ${url}`, e);
    }
}

(async () => {
    try {
        const devPackage = await readPackageFile();

        for (let i = 0; i < packageRelationEntityType.length; i++) {

            const artifactType = packageRelationEntityType[i];
            const artifacts = devPackage[artifactType.name];

            if (!artifacts?.length) continue;

            const artifactTypePath = path.join(artifactsPath, artifactType.entityType);
            for (let y = 0; y < artifacts.length; y++) {
                const artifact = artifacts[y]
                const filename = `${artifact.name || artifact.title || artifact.application}-${artifact.id}`;
                devPackage[artifactType.name][y] = JSON.parse(await readFile(path.join(artifactTypePath, filename) + '.json', 'utf-8') as string);
            }
        }

        for (let i = 0; i < servers.length; i++) {
            await deployPackageFile(devPackage, servers[i].url, servers[i].token);
        }
        console.log('Package has been deployed');
    } catch (e) {
        console.log('Failed to deploy package', e);
    }
    process.exit(0);
})();
