const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('RefreshCcw')) {
  code = code.replace('import { ', 'import { RefreshCcw, ');
}

// 1. Replace the tab bar + Informes tab start
code = code.replace(
  '<div className="flex bg-slate-800/50 p-1 rounded-xl">\n                      <button\n                        onClick={() => setAdminTab(\'informes\')}\n                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${adminTab === \'informes\' ? \'bg-indigo-600 text-white shadow-lg\' : \'text-slate-400 hover:text-white\'}`}\n                      >\n                        Informes\n                      </button>\n                      <button\n                        onClick={() => setAdminTab(\'clientes\')}\n                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${adminTab === \'clientes\' ? \'bg-indigo-600 text-white shadow-lg\' : \'text-slate-400 hover:text-white\'}`}\n                      >\n                        Clientes\n                      </button>\n                      <button\n                        onClick={() => setAdminTab(\'atualizacoes\')}\n                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${adminTab === \'atualizacoes\' ? \'bg-indigo-600 text-white shadow-lg\' : \'text-slate-400 hover:text-white\'}`}\n                      >\n                        Atualizações\n                      </button>\n                    </div>\n                  </div>\n\n                  {adminTab === \'informes\' && (\n                    <>\n                      {/* Announcement Form */}',
  `                  </div>
                  
                  {/* Informes Accordion */}
                  <div className="border border-slate-800 rounded-2xl bg-[#0c0e12] overflow-hidden">
                    <button 
                      type="button"
                      onClick={() => setAdminTab(adminTab === 'informes' ? null : 'informes')}
                      className="w-full flex items-center justify-between p-4 bg-slate-800/20 hover:bg-slate-800/40 text-white font-bold transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Bell size={18} className="text-indigo-400" />
                        Informes
                      </span>
                      <ChevronDown size={18} className={\`transition-transform duration-300 \${adminTab === 'informes' ? 'rotate-180' : ''}\`} />
                    </button>
                    <AnimatePresence>
                      {adminTab === 'informes' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-5 border-t border-slate-800 space-y-4">
                            {/* Announcement Form */}`
);

// 2. Wrap the end of Informes, start Clientes
code = code.replace(
  '                      </div>\n                    </>\n                  )}\n                  \n                  {adminTab === \'clientes\' && (\n                    <>\n                      {/* Clients Form */}',
  `                      </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  {/* Clientes Accordion */}
                  <div className="border border-slate-800 rounded-2xl bg-[#0c0e12] overflow-hidden">
                    <button 
                      type="button"
                      onClick={() => setAdminTab(adminTab === 'clientes' ? null : 'clientes')}
                      className="w-full flex items-center justify-between p-4 bg-slate-800/20 hover:bg-slate-800/40 text-white font-bold transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <User size={18} className="text-blue-400" />
                        Clientes
                      </span>
                      <ChevronDown size={18} className={\`transition-transform duration-300 \${adminTab === 'clientes' ? 'rotate-180' : ''}\`} />
                    </button>
                    <AnimatePresence>
                      {adminTab === 'clientes' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-5 border-t border-slate-800 space-y-4">
                            {/* Clients Form */}`
);

// 3. Wrap end of Clientes, start Atualizações
code = code.replace(
  '                      </div>\n                    </>\n                  )}\n\n                  {adminTab === \'atualizacoes\' && (\n                    <div className="space-y-6">',
  `                      </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Atualizações Accordion */}
                  <div className="border border-slate-800 rounded-2xl bg-[#0c0e12] overflow-hidden">
                    <button 
                      type="button"
                      onClick={() => setAdminTab(adminTab === 'atualizacoes' ? null : 'atualizacoes')}
                      className="w-full flex items-center justify-between p-4 bg-slate-800/20 hover:bg-slate-800/40 text-white font-bold transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <RefreshCcw size={18} className="text-purple-400" />
                        Atualizações
                      </span>
                      <ChevronDown size={18} className={\`transition-transform duration-300 \${adminTab === 'atualizacoes' ? 'rotate-180' : ''}\`} />
                    </button>
                    <AnimatePresence>
                      {adminTab === 'atualizacoes' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-5 border-t border-slate-800 space-y-6">`
);

// 4. Wrap end of Atualizações
code = code.replace(
  '                    </div>\n                  )}\n\n                  <button \n                    onClick={() => {',
  `                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button 
                    onClick={() => {`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Transformed!");
