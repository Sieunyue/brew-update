import { spawn } from 'node:child_process'
import { program } from 'commander'
import ora from 'ora'
import chalk from 'chalk'
import inquirer from "inquirer"

program.version('0.0.1').description('一个简单的更新brew cask命令')

program.option('-a, --all', '更新所有过期的cask')
program.option('-l, --list', '列出所有过期的cask')

program.action(async (opts) => {
  if (!process.env['https_proxy']) {
    console.log(chalk.bgYellow('[WARN]'), '没有设置proxy代理，可能会导致更新失败!')
  }

  const spinner = ora('正在获取过期的cask').start()
  const outedCasks = await parseAllOutedCasks()
  spinner.stop()

  if (outedCasks.length === 0) {
    console.log(chalk.bgGreen('[INFO]'), chalk.green('所有cask都是最新！'))
    return
  }

  if (opts.list) {
    outedCasks.forEach(cask => {
      console.log(cask.name + ':', cask.installed_versions[0], '->', chalk.red(cask.current_version))
    })

    return
  }

  let updateCask = []

  if (opts.all) {
    updateCask = outedCasks.map(cask => cask.name)
  } else {
    const answers = await inquirer.prompt([
      {
        name: 'cask',
        type: 'checkbox',
        message: '请选择要更新的cask',
        choices: outedCasks.map(cask => {
          return {
            name: cask.name + ': ' + cask.installed_versions[0] + ' -> ' + chalk.red(cask.current_version),
            value: cask.name
          }
        })
      }
    ])

    updateCask = [...answers.cask]

  }


  if (updateCask.length === 0) {
    console.log(chalk.bgGreen('[INFO]'), chalk.green('没有选择任何cask!'))
    return
  }

  await updateCasks(...updateCask)

  console.log(chalk.bgGreen('[INFO]'), chalk.green('更新成功!'))
})

const parseAllOutedCasks = async () => {
  return new Promise((resolve, reject) => {
    const child = spawn('brew', ['outdated', '--cask', '--greedy', '--json'], {
      env: process.env
    })

    let data = ''

    child.stdout.on('data', (d) => {
      data += d.toString()
    })

    child.on('close', (code) => {
      if (code !== 0) {
        reject(code)
      } else {
        const node = JSON.parse(data)
        resolve(node.casks)
      }
    })
  })
}

const updateCasks = async (...casks) => {
  return new Promise((resolve, reject) => {
    const child = spawn('brew', ['upgrade', ...casks], {
      env: process.env,
      stdio: 'inherit'
    })

    child.on('close', (code) => {
      if (code !== 0) {
        reject(code)
      } else {
        resolve()
      }
    })
  })

}


  ; (async () => {
    await program.parseAsync(process.argv)
  })()



