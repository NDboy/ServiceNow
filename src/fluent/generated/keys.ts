import '@servicenow/sdk/global'

declare global {
    namespace Now {
        namespace Internal {
            interface Keys extends KeysRegistry {
                explicit: {
                    bom_json: {
                        table: 'sys_module'
                        id: '29235cd830f14ab99badc76831b0c4f2'
                    }
                    'game-portal-page': {
                        table: 'sys_ui_page'
                        id: 'ee64c564fdc548cea0d76cdff03cd14e'
                    }
                    package_json: {
                        table: 'sys_module'
                        id: 'be83e0bd2319401b98f63e9bf071d58f'
                    }
                    'x_1567198_enhanced/main': {
                        table: 'sys_ux_lib_asset'
                        id: 'e9f9f917d0d44f53aaab05856e02ec81'
                    }
                    'x_1567198_enhanced/main.js.map': {
                        table: 'sys_ux_lib_asset'
                        id: 'e59ee0d8f9e548d7844fddcb9179c04d'
                    }
                }
            }
        }
    }
}
